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
                var aCustomers = oModel.getProperty("/value");
                var oCustomer = aCustomers.find(function (customer) {
                    return customer.CustomerID === sCustomerId;
                });
                
                if (oCustomer) {
                    // Set it to a local model for binding
                    var oCustomerModel = this.loadCustomerProperties(oCustomer);
                    this.getView().setModel(oCustomerModel, "customerModel");
                    
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
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$filter=CustomerName eq '${encodeURIComponent(companyName)}'`);
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

            loadCustomerProperties(customer) {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                return new sap.ui.model.json.JSONModel({
                    customerDetails: [
                        { label: bundle.getText("customerIdColumn"), value: customer.CustomerID },
                        { label: bundle.getText("companyNameColumn"), value: customer.CompanyName },
                        { label: bundle.getText("contactNameColumn"), value: customer.ContactName },
                        { label: bundle.getText("contactTitleLabel"), value: customer.ContactTitle },
                        { label: bundle.getText("addressLabel"), value: customer.Address },
                        { label: bundle.getText("cityColumn"), value: customer.City },
                        { label: bundle.getText("regionLabel"), value: customer.Region || "N/A" },
                        { label: bundle.getText("postalCodeLabel"), value: customer.PostalCode },
                        { label: bundle.getText("countryColumn"), value: customer.Country },
                        { label: bundle.getText("phoneColumn"), value: customer.Phone },
                        { label: bundle.getText("faxLabel"), value: customer.Fax || "N/A" }
                    ]
                });
            }

        });
    }
);