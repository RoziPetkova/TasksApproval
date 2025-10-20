sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
        "sap/m/library",
        "sap/ui/model/Sorter",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox"
    ],
    function (Controller, History, mobileLibrary, Sorter, MessageToast, JSONModel, MessageBox) {
        "use strict";
        
        return Controller.extend("appiuimodule.controllers.CustomerDetails", {
            _sortState: {},
            bundle: null,

            onInit() {
                this.bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                const oRouter = this.getOwnerComponent().getRouter();
                //The context (scope) for the callback function
                // Ensures that inside onPatternMatched, this refers to the
                // controller instance
                oRouter.getRoute("customerdetails").attachPatternMatched(this.onPatternMatched, this);
            },

            onPatternMatched: async function (oEvent) {
                var currentCustomerId = oEvent.getParameter("arguments").CustomerID;
                var oModel = this.getOwnerComponent().getModel("customers");
                let currentCustomer = null;

                if (!(oModel && oModel.getProperty("/value") && oModel.getProperty("/value").length === 0)) {
                    currentCustomer = await this.loadCustomerById(currentCustomerId);
                } else {
                    currentCustomer = aCustomers.find(function (customer) {
                        return customer.CustomerID === currentCustomerId;
                    });
                    if (!currentCustomer) {
                        currentCustomer = await this.loadCustomerById(currentCustomerId);
                    }
                }

                this.getView().setModel(new JSONModel(currentCustomer), "customerModel");

                // Fetch orders and invoices 
                await this.loadCustomerOrders(currentCustomerId);
                await this.loadCustomerInvoices(currentCustomerId);

                this.setStickyHeadersForTables();
            },

              loadCustomerById: async function (customerId) {
                try {
                    // Escape single quotes for OData filter
                    const escapedCustomerId = customerId.replace(/'/g, "''");
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$filter=CustomerID eq '${escapedCustomerId}'`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    if (data.value && data.value.length > 0) {
                        const oCustomer = data.value[0];
                        return oCustomer;
                    } else {
                        console.error("Customer not found:", customerId);
                    }
                } catch (error) {
                    console.error("Error loading customer by ID:", error);
                    MessageBox.error(this.bundle.getText("failedToLoadCustomerMessage"));
                }
            },

            loadCustomerOrders: function (customerId) {
                const oTable = this.byId("customerOrdersTable");
                if (oTable) {
                    oTable.setBusy(true);
                }
                try {
                    // Get orders from local orders model
                    const oOrdersModel = this.getOwnerComponent().getModel("orders");
                    let customerOrders = [];

                    if (oOrdersModel && oOrdersModel.getProperty("/value")) {
                        const allOrders = oOrdersModel.getProperty("/value");
                        // Filter orders for this customer
                        customerOrders = allOrders.filter(function (order) {
                            return order.CustomerID === customerId;
                        });
                    }

                    var oCustomerOrdersModel = new JSONModel({
                        orders: customerOrders
                    });
                    this.getView().setModel(oCustomerOrdersModel, "customerOrdersModel");
                } catch (error) {
                    console.error("Error loading customer orders from local model:", error);
                    MessageBox.error(this.bundle.getText("failedToLoadCustomerOrdersMessage"));
                    // Set empty model on error
                    var oCustomerOrdersModel = new JSONModel({
                        orders: []
                    });
                    this.getView().setModel(oCustomerOrdersModel, "customerOrdersModel");
                } finally {
                    oTable.setBusy(false);
                }
            },

            loadCustomerInvoices: async function (sCustomerId) {
                const oTable = this.byId("customerInvoicesTable");
                oTable.setBusy(true);
                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$filter=CustomerID eq '${sCustomerId}'`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    var oCustomerInvoicesModel = new JSONModel({
                        invoices: data.value || []
                    });
                    this.getView().setModel(oCustomerInvoicesModel, "customerInvoicesModel");
                } catch (error) {
                    console.error("Error loading customer invoices:", error);
                    MessageBox.error(this.bundle.getText("failedToLoadCustomerInvoicesMessage"));
                    // Set empty model on error
                    var oCustomerInvoicesModel = new JSONModel({
                        invoices: []
                    });
                    this.getView().setModel(oCustomerInvoicesModel, "customerInvoicesModel");
                } finally {
                    oTable.setBusy(false);
                }
            },

            setStickyHeadersForTables: function () {
                const Sticky = mobileLibrary.Sticky;

                // Set sticky for customer orders table
                const oOrdersTable = this.byId("customerOrdersTable");
                if (oOrdersTable) {
                    oOrdersTable.setSticky([Sticky.ColumnHeaders]);
                }

                // Set sticky for customer invoices table
                const oInvoicesTable = this.byId("customerInvoicesTable");
                if (oInvoicesTable) {
                    oInvoicesTable.setSticky([Sticky.ColumnHeaders]);
                }
            },

            onNavBack() {
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

            formatDate: function (dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            formatCurrency: function (value) {
                if (!value) return "0.00";
                return parseFloat(value).toFixed(2);
            },

            formatFax: function (value) {
                return value || "N/A";
            },

            formatRegion: function (value) {
                return value || "N/A";
            },

            formatStatusState: function (status) {
                switch (status) {
                    case "Shipped":
                        return "Success";
                    case "Pending":
                        return "Warning";
                    case "Declined":
                        return "Error";
                    default:
                        return "None";
                }
            },

            formatShippedDate: function (shippedDate, status) {
                // Show "None" for declined orders
                if (status === "Declined") {
                    return "None";
                }
                if (!shippedDate) return "";
                var date = new Date(shippedDate);
                return date.toLocaleDateString();
            },

            onCustomerOrderPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                const oOrder = oEvent.getSource().getBindingContext("customerOrdersModel").getObject();
                oRouter.navTo("orderdetails", { OrderID: oOrder.OrderID });
            },

            onCustomerInvoicePress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("customerInvoicesModel").getObject();
                // Encode ProductName to handle special characters in URL
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onHomePress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();
            },

            onSettingsSave: function () {
                MessageToast.show(this.bundle.getText("settingsSavedMessage"));
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

            onLogoutPress: async function () {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
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

            onSortOrderDate() {
                this.onSortColumn("customerOrdersTable", "OrderDate", 4);
            },

            onSortStatus() {
                this.onSortColumn("customerOrdersTable", "Status", 6);
            },

            onSortProductName() {
                this.onSortColumn("customerInvoicesTable", "ProductName", 1);
            },

            onSortInvoiceOrderDate() {
                this.onSortColumn("customerInvoicesTable", "OrderDate", 3);
            },

            onSortColumn(tableId, fieldPath, columnIndex, iconIndex = 1) {
                const table = this.byId(tableId);
                const binding = table.getBinding("items");

                if (!this._sortState[tableId]) {
                    this._sortState[tableId] = {};
                }

                this._resetAllSortIcons(tableId);

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
                                    (item.getSrc().includes("sort") || item.getSrc() === "sap-icon://sort")) {
                                    item.setSrc("sap-icon://sort");
                                }
                            });
                        }
                    } else if (header.getMetadata().getName() === "sap.ui.core.Icon") {
                        // Header is directly an Icon
                        if (header.getSrc().includes("sort") || header.getSrc() === "sap-icon://sort") {
                            header.setSrc("sap-icon://sort");
                        }
                    }
                });
            },
        });
    }
);