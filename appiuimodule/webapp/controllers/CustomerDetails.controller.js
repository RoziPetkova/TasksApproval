sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
    ],
    function (Controller, History) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.CustomerDetails", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.controllers.CustomerDetails
             */
            onInit() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("customerdetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched: async function(oEvent) {
                var sCustomerId = oEvent.getParameter("arguments").CustomerID;
                var oModel = this.getOwnerComponent().getModel("customers");
                
                // Check if model exists and has data
                if (!oModel || !oModel.getProperty("/value")) {
                    // If model doesn't exist or has no data, fetch customer directly from API
                    await this.loadCustomerById(sCustomerId);
                    return;
                }
                
                var aCustomers = oModel.getProperty("/value");
                var oCustomer = aCustomers.find(function (customer) {
                    return customer.CustomerID === sCustomerId;
                });
                
                if (oCustomer) {
                    // Set customer data directly to model
                    this.getView().setModel(new sap.ui.model.json.JSONModel(oCustomer), "customerModel");
                    
                    // Fetch orders for this customer from API
                    await this.loadCustomerOrders(sCustomerId);
                    
                    // Fetch invoices for this customer from API
                    await this.loadCustomerInvoices(oCustomer.CompanyName);
                }
                
                this.updateStatusStyle();
            },

            updateStatusStyle: function () {
                var oTable = this.byId("customerOrdersTable");
                if (!oTable) return;
                
                var aItems = oTable.getItems();

                aItems.forEach(function (oItem) {
                    var aCells = oItem.getCells();
                    var oStatusCell = aCells[3]; // Status is the 4th column (index 3)
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

            onNavBack() {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            formatDate: function(dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            formatCurrency: function(value) {
                if (!value) return "0.00";
                return parseFloat(value).toFixed(2);
            },

            formatFax: function(value) {
                return value || "N/A";
            },

            formatRegion: function(value) {
                return value || "N/A";
            },

            loadCustomerById: async function(customerId) {
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
                        
                        // Set customer data directly to model
                        this.getView().setModel(new sap.ui.model.json.JSONModel(oCustomer), "customerModel");
                        
                        // Fetch orders and invoices for this customer
                        await this.loadCustomerOrders(customerId);
                        await this.loadCustomerInvoices(oCustomer.CompanyName);
                        
                        this.updateStatusStyle();
                    } else {
                        console.error("Customer not found:", customerId);
                        // Set empty model
                        this.getView().setModel(new sap.ui.model.json.JSONModel({}), "customerModel");
                        this.getView().setModel(new sap.ui.model.json.JSONModel({orders: []}), "customerOrdersModel");
                        this.getView().setModel(new sap.ui.model.json.JSONModel({invoices: []}), "customerInvoicesModel");
                    }
                } catch (error) {
                    console.error("Error loading customer by ID:", error);
                    // Set empty model on error
                    this.getView().setModel(new sap.ui.model.json.JSONModel({}), "customerModel");
                    this.getView().setModel(new sap.ui.model.json.JSONModel({orders: []}), "customerOrdersModel");
                    this.getView().setModel(new sap.ui.model.json.JSONModel({invoices: []}), "customerInvoicesModel");
                }
            },

            loadCustomerOrders: async function(customerId) {
                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$filter=CustomerID eq '${customerId}'`);
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
                    
                    var oCustomerOrdersModel = new sap.ui.model.json.JSONModel({
                        orders: data.value || []
                    });
                    this.getView().setModel(oCustomerOrdersModel, "customerOrdersModel");
                } catch (error) {
                    console.error("Error loading customer orders:", error);
                    // Set empty model on error
                    var oCustomerOrdersModel = new sap.ui.model.json.JSONModel({
                        orders: []
                    });
                    this.getView().setModel(oCustomerOrdersModel, "customerOrdersModel");
                }
            },

            loadCustomerInvoices: async function(companyName) {
                try {
                    // Escape single quotes in OData filter by doubling them
                    const escapedCompanyName = companyName.replace(/'/g, "''");
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$filter=CustomerName eq '${escapedCompanyName}'`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    var oCustomerInvoicesModel = new sap.ui.model.json.JSONModel({
                        invoices: data.value || []
                    });
                    this.getView().setModel(oCustomerInvoicesModel, "customerInvoicesModel");
                } catch (error) {
                    console.error("Error loading customer invoices:", error);
                    // Set empty model on error
                    var oCustomerInvoicesModel = new sap.ui.model.json.JSONModel({
                        invoices: []
                    });
                    this.getView().setModel(oCustomerInvoicesModel, "customerInvoicesModel");
                }
            },

            onCustomerOrderPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                const oOrder = oEvent.getSource().getBindingContext("customerOrdersModel").getObject();
                oRouter.navTo("orderdetails", { OrderID: oOrder.OrderID });
            },

            onCustomerInvoicePress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                const oInvoice = oEvent.getSource().getBindingContext("customerInvoicesModel").getObject();
                // Encode ProductName to handle special characters in URL
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                oRouter.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onHomePress: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }

                // Set title and icon dynamically for settings
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.settingsDialog.setTitle("Settings");
                this.settingsDialog.setIcon("sap-icon://settings");

                // Clear previous content and add settings content
                this.settingsDialog.removeAllContent();
                this.settingsDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.Text({
                                text: "Some settings should be manipulated here... to be implemented.",
                                textAlign: "Center"
                            })
                        ]
                    })
                );
                
                this.settingsDialog.addStyleClass("sapUiResponsivePadding");
                this.settingsDialog.open();
            },

            onSettingsSave: function() {
                // Placeholder for save functionality
                sap.m.MessageToast.show("Settings saved (placeholder)");
                this.settingsDialog.close();
            },

            onCloseDialog: function() {
                // Generic close function for all dialogs
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutPress: async function() {
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

            onLogoutConfirm: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },


        });
    }
);