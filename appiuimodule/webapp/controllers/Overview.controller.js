sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/Sorter"
    ],
    function (Controller, Filter, FilterOperator, Sorter) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.Overview', {

            // Object to track sort state for different columns and tables
            _sortState: {
                customersTable: {},
                invoicesTable: {},
                ordersTable: {}
            },

            /**
            * Called when a controller is instantiated and its View controls (if available) are already created.
            * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
            * @memberOf appiuimodule.ext.overview.Overview
            */
            // onInit: function () {
            //     console.log("Overview controller initialized");
            //     console.log(this.getView().getModel("tasks"));
            // },


            onPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails", { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
            },

            onCustomerPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails", { CustomerID: oEvent.getSource().getBindingContext("customers").getObject().CustomerID });
            },

            onInvoicePress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                // Encode ProductName to handle special characters in URL
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onFilterTasks: async function(oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchOrders(query);
            },

            searchOrders: async function(query) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                
                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders";
                    
                    if (query && query.trim()) {
                        // Search by CustomerID only
                        const filter = `contains(CustomerID,'${encodeURIComponent(query)}')`;
                        url += `?$filter=${filter}`;
                    } else {
                        // If no query, load more records for scrollable table
                        url += "?$top=100";
                    }
                    
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
                    
                    oOrdersModel.setData(data);
                    
                    // Reapply status styling after data update
                    setTimeout(() => {
                        this.updateStatusStyle();
                    }, 100);
                } catch (error) {
                    console.error("Error searching orders:", error);
                }
            },

            onStatusFilterChange: async function(oEvent) {
                const selectedKey = oEvent.getParameter("selectedItem").getKey();
                await this.searchOrdersByStatus(selectedKey);
            },

            searchOrdersByStatus: async function(status) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                
                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders";
                    
                    if (status === "Shipped") {
                        // Filter for orders that have ShippedDate (not null)
                        url += "?$filter=ShippedDate ne null";
                    } else if (status === "Pending") {
                        // Filter for orders that don't have ShippedDate (null)
                        url += "?$filter=ShippedDate eq null";
                    } else {
                        // Show all orders with higher limit for scrollable table
                        url += "?$top=100";
                    }
                    
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
                    
                    oOrdersModel.setData(data);
                    
                    // Reapply status styling after data update
                    setTimeout(() => {
                        this.updateStatusStyle();
                    }, 100);
                } catch (error) {
                    console.error("Error filtering orders by status:", error);
                }
            },

            formatStatus: function (shippedDate) {
                return shippedDate ? "Shipped" : "Pending";
            },

            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            onAfterRendering: function () {
                this.updateStatusStyle();
            },

            updateStatusStyle: function () {
                var oTable = this.byId("ordersTable");
                var aItems = oTable.getItems();

                aItems.forEach(function (oItem) {
                    var aCells = oItem.getCells();
                    var oStatusCell = aCells[6]; // Status is now the 7th column (index 6)
                    var sStatus = oStatusCell.getText();

                    // Clear previous classes
                    oStatusCell.removeStyleClass("statusPending");
                    oStatusCell.removeStyleClass("statusApproved");
                    oStatusCell.removeStyleClass("statusRejected");

                    // Add appropriate class based on status
                    if (sStatus === "Pending") {
                        oStatusCell.addStyleClass("statusPending");
                    } else if (sStatus === "Shipped") {
                        oStatusCell.addStyleClass("statusApproved");
                    }
                });
            },

            onFilterCustomers: async function(oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchCustomers(query);
            },

            searchCustomers: async function(query) {
                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                
                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Customers";
                    
                    if (query && query.trim()) {
                        // Search by CustomerID or CompanyName only
                        const filter = `contains(CustomerID,'${encodeURIComponent(query)}') or contains(CompanyName,'${encodeURIComponent(query)}')`;
                        url += `?$filter=${filter}`;
                    } else {
                        // If no query, show top 10 as default
                        url += "?$top=10";
                    }
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    oCustomersModel.setData(data);
                } catch (error) {
                    console.error("Error searching customers:", error);
                }
            },

            onFilterInvoices: async function(oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchInvoices(query);
            },

            searchInvoices: async function(query) {
                const oInvoicesModel = this.getOwnerComponent().getModel("invoices");
                
                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Invoices";
                    
                    if (query && query.trim()) {
                        // Search by CustomerName only
                        const filter = `contains(CustomerName,'${encodeURIComponent(query)}')`;
                        url += `?$filter=${filter}`;
                    } else {
                        // If no query, show top 10 as default
                        url += "?$top=10";
                    }
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    oInvoicesModel.setData(data);
                } catch (error) {
                    console.error("Error searching invoices:", error);
                }
            },

            /**
             * Generic sorting function that can be used for any column in any table
             * @param {string} tableId - ID of the table to sort
             * @param {string} fieldPath - Path to the field to sort by
             * @param {number} columnIndex - Index of the column containing the sort icon
             * @param {number} iconIndex - Index of the icon within the column header (default: 1)
             */
            onSortColumn(tableId, fieldPath, columnIndex, iconIndex = 1) {
                const table = this.byId(tableId);
                const binding = table.getBinding("items");

                // Initialize sort state for this table if it doesn't exist
                if (!this._sortState[tableId]) {
                    this._sortState[tableId] = {};
                }

                // Reset all other icons in this table to neutral state
                this._resetAllSortIcons(tableId);

                // Initialize sort state for this field if it doesn't exist (start with descending first click)
                if (this._sortState[tableId][fieldPath] === undefined) {
                    this._sortState[tableId][fieldPath] = false; // false = descending first
                }

                // Toggle sort direction
                this._sortState[tableId][fieldPath] = !this._sortState[tableId][fieldPath];
                const isAscending = this._sortState[tableId][fieldPath];

                // Create sorter
                const sorter = new Sorter(fieldPath, !isAscending);

                // Apply sorting
                binding.sort(sorter);

                // Update icon to show current sort direction
                const columns = table.getColumns();
                const column = columns[columnIndex];
                const header = column.getHeader();

                // Handle different header structures
                let icon = null;
                if (header.getMetadata().getName() === "sap.m.HBox") {
                    // Header is an HBox containing items
                    const headerItems = header.getItems();
                    if (headerItems && headerItems[iconIndex]) {
                        icon = headerItems[iconIndex];
                    }
                } else if (header.getMetadata().getName() === "sap.ui.core.Icon") {
                    // Header is directly an Icon
                    icon = header;
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
             * Reset all sort icons in a table to neutral state
             * @param {string} tableId - ID of the table
             */
            _resetAllSortIcons(tableId) {
                const table = this.byId(tableId);
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header.getMetadata().getName() === "sap.m.HBox") {
                        // Header is an HBox containing items
                        const headerItems = header.getItems();
                        if (headerItems) {
                            headerItems.forEach(function (item) {
                                if (item.getMetadata().getName() === "sap.ui.core.Icon" &&
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://text-align-center")) {
                                    item.setSrc("sap-icon://text-align-center");
                                }
                            });
                        }
                    } else if (header.getMetadata().getName() === "sap.ui.core.Icon") {
                        // Header is directly an Icon
                        if (header.getSrc().includes("sort") || header.getSrc() === "sap-icon://text-align-center") {
                            header.setSrc("sap-icon://text-align-center");
                        }
                    }
                });
            },

            // Specific sort handlers for allowed columns only

            // Customers table - CustomerID and Country sorting allowed
            onSortCustomerId() {
                this.onSortColumn("customersTable", "CustomerID", 0);
            },

            onSortCountry() {
                this.onSortColumn("customersTable", "Country", 3);
            },

            // Invoice table - only Product Name and Customer sorting allowed  
            onSortProductName() {
                this.onSortColumn("invoicesTable", "ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortColumn("invoicesTable", "CustomerName", 2);
            },

            // Orders table - CustomerID and Order Date sorting allowed
            onSortCustomerIdOrders() {
                this.onSortColumn("ordersTable", "CustomerID", 2);
            },

            onSortOrderDate() {
                this.onSortColumn("ordersTable", "OrderDate", 4);
            },


            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onAfterRendering: function() {
            //
            //  },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onExit: function() {
            //
            //  }
        });
    }
);