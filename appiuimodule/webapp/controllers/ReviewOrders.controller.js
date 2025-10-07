sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/Sorter"
    ],
    function (Controller, Filter, FilterOperator, Sorter) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewOrders', {

            // Object to track sort state for different columns
            _sortState: {},

            // Store original orders data for filtering
            _originalOrdersData: null,

            // Track orders loading for growing functionality - start with 50
            _ordersSkip: 0,
            _ordersHasMore: true,

            onInit: function () {
                // Load orders data when controller initializes
                this._loadOrdersModel().then(() => {
                    // Set sticky header for orders table after data is loaded
                    this._setStickyHeaderForOrdersTable();
                });
            },

            /**
             * Set sticky headers for orders table
             * @private
             */
            _setStickyHeaderForOrdersTable: function () {
                sap.ui.require([
                    "sap/m/library"
                ], function (mobileLibrary) {
                    const Sticky = mobileLibrary.Sticky;

                    const oOrdersTable = this.byId("reviewOrdersTable");
                    if (oOrdersTable) {
                        oOrdersTable.setSticky([Sticky.ColumnHeaders]);
                    }
                }.bind(this));
            },

            /**
             * Load orders JSON model - first 50 records
             * @private
             */
            _loadOrdersModel: async function () {
                const oTable = this.byId("reviewOrdersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    // Load first 50 orders
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$top=50";

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Add Status property to each order
                    if (data.value) {
                        data.value.forEach(function (order) {
                            order.Status = order.ShippedDate ? "Shipped" : "Pending";
                        });
                    }

                    // Store original data for filtering/search
                    this._originalOrdersData = data.value;

                    // Add hasMore property for button visibility
                    data.hasMore = data.value && data.value.length === 50;

                    // Create and set the model
                    const oOrdersModel = new sap.ui.model.json.JSONModel();
                    oOrdersModel.setData(data);
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");

                    // Initialize skip counter and check if there are more records
                    this._ordersSkip = 50;
                    this._ordersHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading orders data:", error);
                    const oOrdersModel = new sap.ui.model.json.JSONModel();
                    oOrdersModel.setData({ value: [], hasMore: false });
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");
                } finally {
                    oTable.setBusy(false);
                }
            },

            /**
             * Handle "Load More Orders" button click
             */
            onLoadMoreOrders: async function () {
                if (!this._ordersHasMore) {
                    return;
                }

                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                const currentData = oOrdersModel.getData();
                const oTable = this.byId("reviewOrdersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$top=50&$skip=${this._ordersSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    // Add Status property to new orders
                    if (newData.value) {
                        newData.value.forEach(function (order) {
                            order.Status = order.ShippedDate ? "Shipped" : "Pending";
                        });
                    }

                    // Append new data to existing data
                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        // Update original data for filtering
                        this._originalOrdersData = currentData.value;

                        // Update skip counter and check if there are more records
                        this._ordersSkip += newData.value.length;
                        this._ordersHasMore = newData.value.length === 50;
                        currentData.hasMore = this._ordersHasMore;

                        oOrdersModel.setData(currentData);
                    } else {
                        // No more data available
                        this._ordersHasMore = false;
                        currentData.hasMore = false;
                        oOrdersModel.setData(currentData);
                    }
                } catch (error) {
                    console.error("Error loading more orders data: ", error);
                    this._ordersHasMore = false;
                    currentData.hasMore = false;
                    oOrdersModel.setData(currentData);
                } finally {
                    oTable.setBusy(false);
                }
            },

            /**
             * Navigate back to previous page
             */
            onNavBack: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            /**
             * Navigate to order details
             */
            onOrderPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails",
                    { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
            },

            /**
             * Format status state for ObjectStatus
             */
            formatStatusState: function (status) {
                if (status === "Shipped") {
                    return "Success";
                } else if (status === "Pending") {
                    return "Warning";
                } else if (status === "Declined") {
                    return "Error";
                }
                return "None";
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
             * Handle search/filter
             */
            onFilterOrders: function (oEvent) {
                const query = oEvent.getParameter("query");
                this.searchOrders(query);
            },

            /**
             * Search orders by CustomerID
             */
            searchOrders: function (query) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");

                if (!this._originalOrdersData) {
                    if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                        this._originalOrdersData = oOrdersModel.getProperty("/value");
                    } else {
                        console.warn("Orders data not available for search");
                        return;
                    }
                }

                const allOrders = this._originalOrdersData || [];
                let filteredOrders;

                if (query && query.trim()) {
                    const queryLower = query.toLowerCase();
                    filteredOrders = allOrders.filter(function (order) {
                        return order.CustomerID.toLowerCase().includes(queryLower);
                    });
                } else {
                    filteredOrders = allOrders;
                }

                oOrdersModel.setProperty("/value", filteredOrders);
            },

            /**
             * Handle status filter change
             */
            onStatusFilterChange: function (oEvent) {
                const selectedKey = oEvent.getParameter("selectedItem").getKey();
                this.filterOrdersByStatus(selectedKey);
            },

            /**
             * Filter orders by status
             */
            filterOrdersByStatus: function (status) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");

                if (!this._originalOrdersData) {
                    if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                        this._originalOrdersData = oOrdersModel.getProperty("/value");
                    } else {
                        console.warn("Orders data not available for status filtering");
                        return;
                    }
                }

                const allOrders = this._originalOrdersData || [];
                let filteredOrders;

                if (status === "Shipped") {
                    filteredOrders = allOrders.filter(function (order) {
                        return order.Status === "Shipped";
                    });
                } else if (status === "Pending") {
                    filteredOrders = allOrders.filter(function (order) {
                        return order.Status === "Pending";
                    });
                } else {
                    filteredOrders = allOrders;
                }

                oOrdersModel.setProperty("/value", filteredOrders);
            },

            /**
             * Sort function for orders table
             */
            onSortOrdersColumn(fieldPath, columnIndex) {
                const table = this.byId("reviewOrdersTable");
                const binding = table.getBinding("items");

                if (!this._sortState[fieldPath]) {
                    this._sortState[fieldPath] = false;
                }

                this._resetOrdersHeaderIcons();

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
            _resetOrdersHeaderIcons() {
                const table = this.byId("reviewOrdersTable");
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
            onSortCustomerIdOrders() {
                this.onSortOrdersColumn("CustomerID", 2);
            },

            onSortOrderDate() {
                this.onSortOrdersColumn("OrderDate", 4);
            },

            onSortStatus() {
                this.onSortOrdersColumn("Status", 6);
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
                sap.m.MessageToast.show("Settings saved (placeholder)");
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