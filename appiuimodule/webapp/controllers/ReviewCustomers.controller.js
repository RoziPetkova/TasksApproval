sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewCustomers', {

            // Object to track sort state for different columns
            _sortState: {},

            // Track customers loading for growing functionality - start with 50
            _customersSkip: 0,
            _customersHasMore: true,

            onInit: function () {
                // Load customers data when controller initializes
                this._loadCustomersModel().then(() => {
                    // Set sticky header for customers table after data is loaded
                    this._setStickyHeaderForCustomersTable();
                });
            },

            /**
             * Set sticky headers for customers table
             * @private
             */
            _setStickyHeaderForCustomersTable: function() {
                sap.ui.require([
                    "sap/m/library"
                ], function(mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;
                    
                    const oCustomersTable = this.byId("reviewCustomersTable");
                    if (oCustomersTable) {
                        oCustomersTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },

            /**
             * Load customers JSON model - first 50 records
             * @private
             */
            _loadCustomersModel: async function () {
                var oCustomersModel = new sap.ui.model.json.JSONModel();
                const oTable = this.byId("reviewCustomersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=50");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    // Add hasMore property for button visibility
                    data.hasMore = data.value && data.value.length === 50;
                    
                    oCustomersModel.setData(data);
                    
                    // Initialize skip counter and check if there are more records
                    this._customersSkip = 50;
                    this._customersHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading customers data: ", error);
                    // Set empty model with hasMore false
                    oCustomersModel.setData({ value: [], hasMore: false });
                } finally {
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }

                this.getOwnerComponent().setModel(oCustomersModel, "customers");
            },

            /**
             * Handle "Load More Customers" button click
             */
            onLoadMoreCustomers: async function () {
                if (!this._customersHasMore) {
                    return;
                }

                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                const currentData = oCustomersModel.getData();
                const oTable = this.byId("reviewCustomersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=50&$skip=${this._customersSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();
                    
                    // Append new data to existing data
                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);
                        
                        // Update skip counter and check if there are more records
                        this._customersSkip += newData.value.length;
                        this._customersHasMore = newData.value.length === 50;
                        currentData.hasMore = this._customersHasMore;
                        
                        oCustomersModel.setData(currentData);
                    } else {
                        // No more data available
                        this._customersHasMore = false;
                        currentData.hasMore = false;
                        oCustomersModel.setData(currentData);
                    }
                } catch (error) {
                    console.error("Error loading more customers data: ", error);
                    this._customersHasMore = false;
                    currentData.hasMore = false;
                    oCustomersModel.setData(currentData);
                } finally {
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
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
             * Navigate to customer details
             */
            onCustomerPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("customers").getObject().CustomerID });
            },

            /**
             * Handle search/filter
             */
            onFilterCustomers: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchCustomers(query);
            },

            /**
             * Search customers by CustomerID or CompanyName
             */
            searchCustomers: async function (query) {
                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                const oTable = this.byId("reviewCustomersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Customers";

                    if (query && query.trim()) {
                        // Search by CustomerID or CompanyName only - escape single quotes for OData
                        const escapedQuery = query.replace(/'/g, "''");
                        const filter = `contains(CustomerID,'${escapedQuery}') or contains(CompanyName,'${escapedQuery}')`;
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
                    
                    oCustomersModel.setData(data);
                    
                    // Reset pagination state when searching
                    this._customersSkip = data.value ? data.value.length : 0;
                    this._customersHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error searching customers:", error);
                } finally {
                    const oTable = this.byId("reviewCustomersTable");
                    if (oTable) {
                        oTable.setBusy(false);
                    }
                }
            },

            /**
             * Sort function for customers table
             */
            onSortCustomersColumn(fieldPath, columnIndex) {
                const table = this.byId("reviewCustomersTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetCustomersHeaderIcons();

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
            _resetCustomersHeaderIcons() {
                const table = this.byId("reviewCustomersTable");
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
            onSortCustomerId() {
                this.onSortCustomersColumn("CustomerID", 0);
            },

            onSortCountry() {
                this.onSortCustomersColumn("Country", 3);
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

            onLogoutPress: async function() {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
            },

            onSettingsSave: function() {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                sap.m.MessageToast.show(bundle.getText("settingsSavedMessage"));
                this.settingsDialog.close();
            },

            onCloseDialog: function() {
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutConfirm: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
            },
        });
    }
);