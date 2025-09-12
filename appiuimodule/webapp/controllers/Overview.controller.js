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

            onFilterTasks(oEvent) {
                const query = oEvent.getParameter("query");
                const table = this.byId("ordersTable");
                const tasks = table.getBinding("items");
                const filteredTasks = [];

                if (query) {
                    filteredTasks.push(new Filter({
                        filters: [
                            new Filter("title", FilterOperator.Contains, query),
                            new Filter("employee", FilterOperator.Contains, query)
                        ],
                        and: false // false = OR filter
                    }));
                }

                tasks.filter(filteredTasks);
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

            onFilterCustomers(oEvent) {
                const query = oEvent.getParameter("query");
                const table = this.byId("customersTable");
                const binding = table.getBinding("items");
                const filters = [];

                if (query) {
                    filters.push(new Filter({
                        filters: [
                            new Filter("CustomerID", FilterOperator.Contains, query),
                            new Filter("CompanyName", FilterOperator.Contains, query),
                            new Filter("ContactName", FilterOperator.Contains, query),
                            new Filter("Country", FilterOperator.Contains, query)
                        ],
                        and: false
                    }));
                }

                binding.filter(filters);
            },

            onFilterInvoices(oEvent) {
                const query = oEvent.getParameter("query");
                const table = this.byId("invoicesTable");
                const binding = table.getBinding("items");
                const filters = [];

                if (query) {
                    filters.push(new Filter({
                        filters: [
                            new Filter("OrderID", FilterOperator.Contains, query),
                            new Filter("ProductName", FilterOperator.Contains, query),
                            new Filter("CustomerName", FilterOperator.Contains, query)
                        ],
                        and: false
                    }));
                }

                binding.filter(filters);
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
                
                // Initialize sort state for this field if it doesn't exist
                if (!this._sortState[tableId][fieldPath]) {
                    this._sortState[tableId][fieldPath] = true; // true = ascending
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
                const icon = column.getHeader().getItems()[iconIndex];
                
                if (isAscending) {
                    icon.setSrc("sap-icon://sort-ascending");
                } else {
                    icon.setSrc("sap-icon://sort-descending");
                }
            },

            // Specific sort handlers that call the generic function
            onSortCountry() {
                this.onSortColumn("customersTable", "Country", 3);
            },

            onSortCompanyName() {
                this.onSortColumn("customersTable", "CompanyName", 1);
            },

            onSortCustomerId() {
                this.onSortColumn("customersTable", "CustomerID", 0);
            },

            onSortContactName() {
                this.onSortColumn("customersTable", "ContactName", 2);
            },

            // Invoice table sorting
            onSortOrderId() {
                this.onSortColumn("invoicesTable", "OrderID", 0);
            },

            onSortProductName() {
                this.onSortColumn("invoicesTable", "ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortColumn("invoicesTable", "CustomerName", 2);
            },

            // Orders table sorting
            onSortOrderDate() {
                this.onSortColumn("ordersTable", "OrderDate", 4);
            },

            onSortShipCountry() {
                this.onSortColumn("ordersTable", "ShipCountry", 3);
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