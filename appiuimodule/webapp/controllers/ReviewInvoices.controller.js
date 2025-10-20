sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/ui/Device",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, Device, MessageToast, JSONModel, MessageBox) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewInvoices', {
            _bundle: null,
            _sortState: {},
            _invoicesSkip: 0,
            _invoicesHasMore: true,

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._loadInvoicesModel().then(() => {
                    this._setStickyHeaderForInvoicesTable();
                });
                this.setViewModel();
            },

            setViewModel() {
                let isMobile = false;
                if (Device.system.phone || Device.system.tablet) {
                    isMobile = true;
                }
                var viewModel = new JSONModel({
                    isMobile: isMobile
                });
                this.getView().setModel(viewModel, "viewModel");
            },

            _setStickyHeaderForInvoicesTable: function () {
                sap.ui.require([
                    "sap/m/library"
                ], function (mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;

                    const oInvoicesTable = this.byId("reviewInvoicesTable");
                    if (oInvoicesTable) {
                        oInvoicesTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },

            _loadInvoicesModel: async function () {
                var oInvoicesModel = new JSONModel();
                const oTable = this.byId("reviewInvoicesTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$top=50");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    data.hasMore = data.value && data.value.length === 50;

                    oInvoicesModel.setData(data);

                    this._invoicesSkip = 50;
                    this._invoicesHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading invoices data:", error);
                    oInvoicesModel.setData({ value: [], hasMore: false });
                    MessageBox.error(this._bundle.getText("failedToLoadInvoicesMessage"));
                } finally {
                    oTable.setBusy(false);
                }

                this.getOwnerComponent().setModel(oInvoicesModel, "invoices");
            },

            onLoadMoreInvoices: async function () {
                if (!this._invoicesHasMore) {
                    return;
                }

                const oInvoicesModel = this.getOwnerComponent().getModel("invoices");
                const currentData = oInvoicesModel.getData();
                const oTable = this.byId("reviewInvoicesTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$top=50&$skip=${this._invoicesSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        this._invoicesSkip += newData.value.length;
                        this._invoicesHasMore = newData.value.length === 50;
                        currentData.hasMore = this._invoicesHasMore;

                        oInvoicesModel.setData(currentData);
                    } else {
                        this._invoicesHasMore = false;
                        currentData.hasMore = false;
                        oInvoicesModel.setData(currentData);
                    }
                } catch (error) {
                    console.error("Error loading more invoices data: ", error);
                    this._invoicesHasMore = false;
                    currentData.hasMore = false;
                    oInvoicesModel.setData(currentData);
                    MessageBox.error(this._bundle.getText("failedToLoadMoreInvoicesMessage"));
                } finally {
                    oTable.setBusy(false);
                }
            },

            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            onInvoicePress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            formatCurrency: function (amount) {
                //Such one-line if's can be hard to track, please use the brackets {} for any case.
                //Further more - what do you think of doing it with a ternary operator ->
                // return !amount ? "" :  parseFloat(amount).toFixed(2) + " USD"
                if (!amount) return "";
                return parseFloat(amount).toFixed(2) + " USD";
            },

            onFilterInvoices: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchInvoices(query);
            },

            searchInvoices: async function (query) {
                const oInvoicesModel = this.getOwnerComponent().getModel("invoices");

                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Invoices";

                    if (query && query.trim()) {
                        const escapedQuery = query.replace(/'/g, "''");
                        const filter = `contains(CustomerName,'${escapedQuery}')`;
                        url += `?$filter=${encodeURIComponent(filter)}`;
                    } else {
                        url += "?$top=50";
                    }

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    data.hasMore = data.value && data.value.length === 50;

                    oInvoicesModel.setData(data);

                    this._invoicesSkip = data.value ? data.value.length : 0;
                    this._invoicesHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error searching invoices:", error);
                    MessageBox.error(this._bundle.getText("failedToSearchInvoicesMessage"));
                }
            },

            onSortInvoicesColumn(fieldPath, columnIndex) {
                const table = this.byId("reviewInvoicesTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetInvoicesHeaderIcons();

                this._sortState[fieldPath] = !this._sortState[fieldPath];
                const isAscending = this._sortState[fieldPath];

                const sorter = new Sorter(fieldPath, !isAscending);
                binding.sort(sorter);

                const columns = table.getColumns();
                const column = columns[columnIndex];
                const header = column.getHeader();

                let icon = null;
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[1]) {
                        icon = headerItems[1];
                    }
                }

                if (icon && icon.getMetadata().getName() === "sap.ui.core.Icon") {
                    if (isAscending) {
                        icon.setSrc("sap-icon://sort-ascending");
                    } else {
                        icon.setSrc("sap-icon://sort-descending");
                    }
                }
            },

            _resetInvoicesHeaderIcons() {
                const table = this.byId("reviewInvoicesTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        const headerItems = header.getItems();
                        if (headerItems) {
                            headerItems.forEach(function (item) {
                                if (item.getMetadata().getName() === "sap.ui.core.Icon" &&
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://text-align-center")) {
                                    item.setSrc("sap-icon://sort");
                                }
                            });
                        }
                    }
                });
            },

            onSortProductName() {
                this.onSortInvoicesColumn("ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortInvoicesColumn("CustomerName", 2);
            },

            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();
            },

            onLogoutPress: async function () {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
            },

            onSettingsSave: function () {
                MessageToast.show(this._bundle.getText("settingsSavedMessage"));
                this.settingsDialog.close();
            },

            onCloseDialog: function () {
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutConfirm: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
            },
        });
    }
);