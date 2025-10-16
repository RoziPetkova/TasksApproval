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
                
                this._setStickyHeaderForInvoicesTable();
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
                if (!amount) return "";
                return parseFloat(amount).toFixed(2) + " USD";
            },

            onFilterInvoices: async function (oEvent) {
                const sQuery = oEvent.getParameter("query");
                const oTable = this.byId("reviewInvoicesTable");
                //take the binding object - the link between table content and data
                const oBinding = oTable.getBinding("items");

                if (sQuery && sQuery.trim()) {
                    const oFilter = new Filter({
                        filters: [
                            new Filter("CustomerID", FilterOperator.Contains, sQuery),
                            new Filter("ProductName", FilterOperator.Contains, sQuery)
                        ],
                        and: false
                    });
                    //"Application"	Your app’s logical/user filters (search, select, etc.)
                    //"Control"	Filters applied by SAPUI5 controls internally
                    oBinding.filter(oFilter, "Application");
                } else {
                    oBinding.filter([], "Application");
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