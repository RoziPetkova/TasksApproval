sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/core/routing/History",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/model/Sorter",
        "sap/m/library"
    ],
    function (Controller, History, Filter, FilterOperator, Sorter, mobileLibrary) {
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

            // Track customers loading for growing functionality
            _customersSkip: 0,
            _customersHasMore: true,

            // Track invoices loading for growing functionality
            _invoicesSkip: 0,
            _invoicesHasMore: true,

            onInit: function () {
                // Load all data models when overview controller initializes
                Promise.all([
                    this._loadCustomersModel(),
                    this._loadInvoicesModel(),
                    this._loadAllOrders()
                ]).then(() => {
                    // Set sticky header for customers table after data is loaded
                    this._setStickyHeaderForCustomersTable();
                });
            },

            /**
             * Set sticky headers for all tables
             * @private
             */
            _setStickyHeaderForCustomersTable: function () {
                // Sticky is enum, not module. That's why its imported like that. 
                const Sticky = mobileLibrary.Sticky;

                // Set sticky for customers table
                const oCustomersTable = this.byId("customersTable");
                if (oCustomersTable) {
                    oCustomersTable.setSticky([Sticky.ColumnHeaders]);
                }
                // Set sticky for orders table
                const oOrdersTable = this.byId("ordersTable");
                if (oOrdersTable) {
                    oOrdersTable.setSticky([Sticky.ColumnHeaders]);
                }
                // Set sticky for invoices table
                const oInvoicesTable = this.byId("invoicesTable");
                if (oInvoicesTable) {
                    oInvoicesTable.setSticky([Sticky.ColumnHeaders]);
                }
            },

            /**
             * Load the customers JSON model - first 10 records only
             * @private
             */
            _loadCustomersModel: async function () {
                const oCustomersTable = this.byId("customersTable");
                if (oCustomersTable) {
                    oCustomersTable.setBusy(true);
                }

                var oCustomersModel = new sap.ui.model.json.JSONModel();

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=10");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Add hasMore property for button visibility
                    data.hasMore = data.value && data.value.length === 10;

                    oCustomersModel.setData(data);

                    // Initialize skip counter and check if there are more records
                    this._customersSkip = 10;
                    this._customersHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading customers data: ", error);
                    // Set empty model with hasMore false
                    oCustomersModel.setData({ value: [], hasMore: false });
                } finally {
                    if (oCustomersTable) {
                        oCustomersTable.setBusy(false);
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

                const oCustomersTable = this.byId("customersTable");
                if (oCustomersTable) {
                    oCustomersTable.setBusy(true);
                }

                const oCustomersModel = this.getOwnerComponent().getModel("customers");
                const currentData = oCustomersModel.getData();

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=10&$skip=${this._customersSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    // Append new data to existing data
                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        // Update skip counter and check if there are more records
                        this._customersSkip += newData.value.length;
                        this._customersHasMore = newData.value.length === 10;
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
                    if (oCustomersTable) {
                        oCustomersTable.setBusy(false);
                    }
                }
            },

            /**
             * Handle "Load More Invoices" button click
             */
            onLoadMoreInvoices: async function () {
                if (!this._invoicesHasMore) {
                    return;
                }

                const oInvoicesTable = this.byId("invoicesTable");
                if (oInvoicesTable) {
                    oInvoicesTable.setBusy(true);
                }

                const oInvoicesModel = this.getOwnerComponent().getModel("invoices");
                const currentData = oInvoicesModel.getData();

                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$top=10&$skip=${this._invoicesSkip}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const newData = await response.json();

                    // Append new data to existing data
                    if (newData.value && newData.value.length > 0) {
                        currentData.value = currentData.value.concat(newData.value);

                        // Update skip counter and check if there are more records
                        this._invoicesSkip += newData.value.length;
                        this._invoicesHasMore = newData.value.length === 10;
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
                } finally {
                    if (oInvoicesTable) {
                        oInvoicesTable.setBusy(false);
                    }
                }
            },

            /**
             * Load the invoices JSON model - first 10 records only
             * @private
             */
            _loadInvoicesModel: async function () {
                const oInvoicesTable = this.byId("invoicesTable");
                if (oInvoicesTable) {
                    oInvoicesTable.setBusy(true);
                }

                var oInvoicesModel = new sap.ui.model.json.JSONModel();

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$top=10");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Add hasMore property for button visibility
                    data.hasMore = data.value && data.value.length === 10;

                    oInvoicesModel.setData(data);

                    // Initialize skip counter and check if there are more records
                    this._invoicesSkip = 10;
                    this._invoicesHasMore = data.hasMore;
                } catch (error) {
                    console.error("Error loading invoices data:", error);
                    // Set empty model with hasMore false
                    oInvoicesModel.setData({ value: [], hasMore: false });
                } finally {
                    if (oInvoicesTable) {
                        oInvoicesTable.setBusy(false);
                    }
                }

                this.getOwnerComponent().setModel(oInvoicesModel, "invoices");
            },

            /**
             * Load all orders and save them in the model
             * @private
             */
            _loadAllOrders: async function () {
                const oOrdersTable = this.byId("ordersTable");
                if (oOrdersTable) {
                    oOrdersTable.setBusy(true);
                }

                try {
                    // Load ALL orders without any limit
                    let url = "https://services.odata.org/V4/Northwind/Northwind.svc/Orders";

                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    // Add Status property to each order
                    if (data && data.value) {
                        this.handleStatusProperty(data);
                    }

                    // Store original data for filtering/search
                    this._originalOrdersData = data.value;

                    // Create and set the model
                    const oOrdersModel = new sap.ui.model.json.JSONModel();
                    oOrdersModel.setData(data);
                    this.getOwnerComponent().setModel(oOrdersModel, "orders");
                } catch (error) {
                    console.error("Error loading all orders:", error);
                } finally {
                    if (oOrdersTable) {
                        oOrdersTable.setBusy(false);
                    }
                }
            },


            handleStatusProperty(data) {
                data.value.forEach(function (order) {
                    if (order.OrderID % 2 == 0) {
                       order.ShippedDate = null;
                    }
                     order.Status = order.ShippedDate ? "Shipped" : "Pending";
                });
            },

            onOrderPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("orderdetails",
                    { OrderID: oEvent.getSource().getBindingContext("orders").getObject().OrderID });
            },

            onCustomerPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("customers").getObject().CustomerID });
            },

            onInvoicePress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID
                });
            },

            formatStatusState: function (status) {
                // Return the appropriate state for ObjectStatus control
                if (status === "Shipped") {
                    return "Success";
                } else if (status === "Pending") {
                    return "Warning";
                } else if (status === "Declined") {
                    return "Error";
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
                    filteredOrders = allOrders.filter(function (order) {
                        return order.CustomerID.toLowerCase().includes(queryLower);
                    });
                } else {
                    // Show all orders if no query
                    filteredOrders = allOrders;
                }

                // Update the model with filtered data
                oOrdersModel.setProperty("/value", filteredOrders);
            },

            onStatusFilterChange: function (oEvent) {
                const selectedKey = oEvent.getParameter("selectedItem").getKey();
                this.filterOrdersByStatus(selectedKey);
            },

            filterOrdersByStatus: function (status) {
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
                    filteredOrders = allOrders.filter(function (order) {
                        return order.Status === "Shipped";
                    });
                } else if (status === "Pending") {
                    filteredOrders = allOrders.filter(function (order) {
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

            /**
             * Sort function for customers table (single table with sticky headers)
             */
            onSortCustomersColumn(fieldPath, columnIndex) {
                const table = this.byId("customersTable");
                const binding = table.getBinding("items");

                // Initialize sort state for customers table if it doesn't exist
                if (!this._sortState["customersTable"]) {
                    this._sortState["customersTable"] = {};
                }

                // Reset all other icons to neutral state
                this._resetCustomersHeaderIcons();

                // Initialize sort state for this field if it doesn't exist (start with descending first click)
                if (this._sortState["customersTable"][fieldPath] === undefined) {
                    this._sortState["customersTable"][fieldPath] = false; // false = descending first
                }

                // Toggle sort direction
                this._sortState["customersTable"][fieldPath] = !this._sortState["customersTable"][fieldPath];
                const isAscending = this._sortState["customersTable"][fieldPath];

                // Create sorter
                const sorter = new Sorter(fieldPath, !isAscending);

                // Apply sorting to table
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
             * Reset all sort icons in customers table to neutral state
             */
            _resetCustomersHeaderIcons() {
                const table = this.byId("customersTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        // Header is an HBox containing items
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

            /**
             * Sort function for invoices table (single table with sticky headers)
             */
            onSortInvoicesColumn(fieldPath, columnIndex) {
                const table = this.byId("invoicesTable");
                const binding = table.getBinding("items");

                // Initialize sort state for invoices table if it doesn't exist
                if (!this._sortState["invoicesTable"]) {
                    this._sortState["invoicesTable"] = {};
                }

                // Reset all other icons to neutral state
                this._resetInvoicesHeaderIcons();

                // Initialize sort state for this field if it doesn't exist (start with descending first click)
                if (this._sortState["invoicesTable"][fieldPath] === undefined) {
                    this._sortState["invoicesTable"][fieldPath] = false; // false = descending first
                }

                // Toggle sort direction
                this._sortState["invoicesTable"][fieldPath] = !this._sortState["invoicesTable"][fieldPath];
                const isAscending = this._sortState["invoicesTable"][fieldPath];

                // Create sorter
                const sorter = new Sorter(fieldPath, !isAscending);

                // Apply sorting to table
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
             * Reset all sort icons in invoices table to neutral state
             */
            _resetInvoicesHeaderIcons() {
                const table = this.byId("invoicesTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        // Header is an HBox containing items
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

            /**
             * Sort function for orders table (single table with sticky headers)
             */
            onSortOrdersColumn(fieldPath, columnIndex) {
                const table = this.byId("ordersTable");
                const binding = table.getBinding("items");

                // Initialize sort state for orders table if it doesn't exist
                if (!this._sortState["ordersTable"]) {
                    this._sortState["ordersTable"] = {};
                }

                // Reset all other icons to neutral state
                this._resetOrdersHeaderIcons();

                // Initialize sort state for this field if it doesn't exist (start with descending first click)
                if (this._sortState["ordersTable"][fieldPath] === undefined) {
                    this._sortState["ordersTable"][fieldPath] = false; // false = descending first
                }

                // Toggle sort direction
                this._sortState["ordersTable"][fieldPath] = !this._sortState["ordersTable"][fieldPath];
                const isAscending = this._sortState["ordersTable"][fieldPath];

                // Create sorter
                const sorter = new Sorter(fieldPath, !isAscending);

                // Apply sorting to table
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
             * Reset all sort icons in orders table to neutral state
             */
            _resetOrdersHeaderIcons() {
                const table = this.byId("ordersTable");
                const columns = table.getColumns();

                columns.forEach(function (column) {
                    const header = column.getHeader();

                    if (header && header.getMetadata().getName() === "sap.m.HBox") {
                        // Header is an HBox containing items
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

            // Specific sort handlers for allowed columns only

            // Customers table - CustomerID and Country sorting allowed
            onSortCustomerId() {
                this.onSortCustomersColumn("CustomerID", 0);
            },

            onSortCountry() {
                this.onSortCustomersColumn("Country", 3);
            },

            // Invoice table - only Product Name and Customer sorting allowed  
            onSortProductName() {
                this.onSortInvoicesColumn("ProductName", 1);
            },

            onSortCustomerName() {
                this.onSortInvoicesColumn("CustomerName", 2);
            },

            // Orders table - CustomerID and Status sorting allowed
            onSortCustomerIdOrders() {
                this.onSortOrdersColumn("CustomerID", 2);
            },

            onSortOrderDate() {
                this.onSortOrdersColumn("OrderDate", 4);
            },

            onSortStatus() {
                this.onSortOrdersColumn("Status", 6);
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

                // Set title and icon dynamically for logout
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.logoutDialog.setTitle(bundle.getText("logoutTitle"));
                this.logoutDialog.setIcon("sap-icon://log");

                // Clear previous content and add logout confirmation content
                this.logoutDialog.removeAllContent();
                this.logoutDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.Text({
                                text: bundle.getText("logoutConfirmationMessage"),
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.logoutDialog.open();
            },

            onSettingsSave: function () {
                // Placeholder for save functionality
                sap.m.MessageToast.show("Settings saved (placeholder)");
                this.settingsDialog.close();
            },

            onCloseDialog: function () {
                // Generic close function for all dialogs
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

            onNavBack: function () {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("entrypanel", {}, true);
                }
            },
        });
    }
);