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

            // Store original orders data for filtering
            _originalOrdersData: null,

            onInit: function () {
                // Listen for orders model data changes and store original data
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                if (oOrdersModel) {
                    oOrdersModel.attachPropertyChange(this.onOrdersDataChanged, this);
                    // Also check if data is already loaded
                    this.onOrdersDataChanged();
                }
            },

            onOrdersDataChanged: function() {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                if (oOrdersModel && oOrdersModel.getProperty("/value") && oOrdersModel.getProperty("/value").length > 0) {
                    // Store original data for filtering/search if not already stored
                    if (!this._originalOrdersData) {
                        this._originalOrdersData = oOrdersModel.getProperty("/value");
                    }
                }
            },

            onOrderPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails",
                    { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
            },

            onCustomerPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("customers").getObject().CustomerID });
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

            formatStatusState: function (status) {
                // Return the appropriate state for ObjectStatus control
                if (status === "Shipped") {
                    return "Success";
                } else if (status === "Pending") {
                    return "Warning";
                }
                return "None";
            },

            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            onFilterOrders: function (oEvent) {
                const query = oEvent.getParameter("query");
                this.searchOrders(query);
            },

            searchOrders: function (query) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                
                // Check if original data exists, if not try to set it
                if (!this._originalOrdersData) {
                    if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                        this._originalOrdersData = oOrdersModel.getProperty("/value");
                    } else {
                        console.warn("Orders data not available for search");
                        return;
                    }
                }
                
                // Use stored original data for search
                const allOrders = this._originalOrdersData || [];
                let filteredOrders;
                
                if (query && query.trim()) {
                    // Filter by CustomerID locally
                    const queryLower = query.toLowerCase();
                    filteredOrders = allOrders.filter(function(order) {
                        return order.CustomerID.toLowerCase().includes(queryLower);
                    });
                } else {
                    // Show all orders if no query
                    filteredOrders = allOrders;
                }
                
                // Update the model with filtered data
                oOrdersModel.setProperty("/value", filteredOrders);
            },

            onStatusFilterChange: function(oEvent) {
                const selectedKey = oEvent.getParameter("selectedItem").getKey();
                this.filterOrdersByStatus(selectedKey);
            },

            filterOrdersByStatus: function(status) {
                const oOrdersModel = this.getOwnerComponent().getModel("orders");
                
                // Check if original data exists, if not try to set it
                if (!this._originalOrdersData) {
                    if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                        this._originalOrdersData = oOrdersModel.getProperty("/value");
                    } else {
                        console.warn("Orders data not available for status filtering");
                        return;
                    }
                }
                
                // Use stored original data for filtering
                const allOrders = this._originalOrdersData || [];
                let filteredOrders;
                
                if (status === "Shipped") {
                    filteredOrders = allOrders.filter(function(order) {
                        return order.Status === "Shipped";
                    });
                } else if (status === "Pending") {
                    filteredOrders = allOrders.filter(function(order) {
                        return order.Status === "Pending";
                    });
                } else {
                    // Show all orders for "All" or no selection
                    filteredOrders = allOrders;
                }
                
                // Update the model with filtered data
                oOrdersModel.setProperty("/value", filteredOrders);
            },

            onFilterCustomers: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchCustomers(query);
            },

            searchCustomers: async function (query) {
                const oCustomersModel = this.getOwnerComponent().getModel("customers");

                try {
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Customers";

                    if (query && query.trim()) {
                        // Search by CustomerID or CompanyName only - escape single quotes for OData
                        const escapedQuery = query.replace(/'/g, "''");
                        const filter = `contains(CustomerID,'${escapedQuery}') or contains(CompanyName,'${escapedQuery}')`;
                        url += `?$filter=${encodeURIComponent(filter)}`;
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

            onFilterInvoices: async function (oEvent) {
                const query = oEvent.getParameter("query");
                await this.searchInvoices(query);
            },

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

            // Orders table - CustomerID and Status sorting allowed
            onSortCustomerIdOrders() {
                this.onSortColumn("ordersTable", "CustomerID", 2);
            },

            onSortStatus() {
                this.onSortColumn("ordersTable", "Status", 6);
            },

            onSettingsPress: function () {
                // Placeholder for settings functionality
                sap.m.MessageToast.show("Settings functionality not implemented yet");
            },

            onLogoutPress: async function () {
                this.logoutDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Set title dynamically for logout
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.logoutDialog.setTitle(bundle.getText("logoutTitle"));

                // Clear previous content
                this.logoutDialog.removeAllContent();

                // Add logout confirmation content
                this.logoutDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://log" }),
                            new sap.m.Text({
                                text: bundle.getText("logoutConfirmationMessage"),
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.logoutDialog.setBeginButton(new sap.m.Button({
                    text: bundle.getText("confirmLogoutButton"),
                    press: function () {
                        const oRouter = this.getOwnerComponent().getRouter();
                        oRouter.navTo("logout");
                        this.logoutDialog.close();
                    }.bind(this)
                }));

                this.logoutDialog.setEndButton(new sap.m.Button({
                    text: bundle.getText("dialogCloseButtonText"),
                    press: function () {
                        this.logoutDialog.close();
                    }.bind(this)
                }));

                this.logoutDialog.open();
            },
        });
    }
);