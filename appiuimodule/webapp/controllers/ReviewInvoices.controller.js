sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/ui/Device",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, Device, MessageToast, JSONModel) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewInvoices', {

            // Object to track sort state for different columns
            _sortState: {},

            // Track invoices loading for growing functionality - start with 50
            _invoicesSkip: 0,
            _invoicesHasMore: true,

            onInit: function () {
                // Load invoices data when controller initializes
                this._loadInvoicesModel().then(() => {
                    // Set sticky header for invoices table after data is loaded
                    this._setStickyHeaderForInvoicesTable();
                });
                this.setViewModel();
            },

            setViewModel() {
                let isMobile = false;
                if (Device.system.phone || Device.system.tablet) {
                    isMobile = true;
                }
                // Create view model
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

            /**
             * Load invoices JSON model - first 50 records
             * @private
             */
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

                    // Add hasMore property for button visibility
                    data.hasMore = data.value && data.value.length === 50;

                    oInvoicesModel.setData(data);

                    // Initialize skip counter and check if there are more records
                    this._invoicesSkip = 50;
                    this._invoicesHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading invoices data:", error);
                    // Set empty model with hasMore false
                    oInvoicesModel.setData({ value: [], hasMore: false });
                    var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(bundle.getText("failedToLoadInvoicesMessage"));
                } finally {
                    oTable.setBusy(false);
                }

                this.getOwnerComponent().setModel(oInvoicesModel, "invoices");
            },

            /**
             * Handle "Load More Invoices" button click
             */
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

                    // Append new data to existing data
                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        // Update skip counter and check if there are more records
                        this._invoicesSkip += newData.value.length;
                        this._invoicesHasMore = newData.value.length === 50;
                        currentData.hasMore = this._invoicesHasMore;

                        oInvoicesModel.setData(currentData);
                    } else {
                        // No more data available
                        this._invoicesHasMore = false;
                        currentData.hasMore = false;
                        oInvoicesModel.setData(currentData);
                    }
                } catch (error) {
                    console.error("Error loading more invoices data: ", error);
                    this._invoicesHasMore = false;
                    currentData.hasMore = false;
                    oInvoicesModel.setData(currentData);
                    var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(bundle.getText("failedToLoadMoreInvoicesMessage"));
                } finally {
                    oTable.setBusy(false);
                }
            },

            /**
             * Navigate back to previous page
             */
            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    //cannot be done by router - we need to split the history and then check what
                    //is the property key of the previous hash
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            /**
             * Navigate to invoice details
             */
            onInvoicePress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            /**
             * Format date
             */
            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            /**
             * Format currency
             */
            formatCurrency: function (amount) {
                if (!amount) return "";
                return parseFloat(amount).toFixed(2) + " USD";
            },

            /**
             * Handle search/filter
             */
            onFilterInvoices: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchInvoices(query);
            },

            /**
             * Search invoices by CustomerName
             */
            searchInvoices: async function (query) {
                const oInvoicesModel = this.getOwnerComponent().getModel("invoices");

                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Invoices";

                    if (query && query.trim()) {
                        // Search by CustomerName only - escape single quotes for OData
                        const escapedQuery = query.replace(/'/g, "''");
                        const filter = `contains(CustomerName,'${escapedQuery}')`;
                        url += `?$filter=${encodeURIComponent(filter)}`;
                    } else {
                        // If no query, show top 50 as default
                        url += "?$top=50";
                    }

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Add hasMore property based on result count
                    data.hasMore = data.value && data.value.length === 50;

                    oInvoicesModel.setData(data);

                    // Reset pagination state when searching
                    this._invoicesSkip = data.value ? data.value.length : 0;
                    this._invoicesHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error searching invoices:", error);
                    var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                    MessageToast.show(bundle.getText("failedToSearchInvoicesMessage"));
                }
            },

            /**
             * Sort function for invoices table
             */
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

            /**
             * Reset all sort icons to neutral state
             */
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

            // Specific sort handlers
            onSortProductName() {
                this.onSortInvoicesColumn("ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortInvoicesColumn("CustomerName", 2);
            },

            // Settings and Logout dialog handlers
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
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                sap.m.MessageToast.show(bundle.getText("settingsSavedMessage"));
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