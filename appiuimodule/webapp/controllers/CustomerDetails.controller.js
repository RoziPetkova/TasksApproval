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

            onObjectMatched(oEvent) {
                var sCustomerId = oEvent.getParameter("arguments").CustomerID;
                var oModel = this.getOwnerComponent().getModel("customers");
                var aCustomers = oModel.getProperty("/customers");
                var oCustomer = aCustomers.find(function (customer) {
                    return customer.CustomerID === sCustomerId;
                });
                
                if (oCustomer) {
                    // Set it to a local model for binding
                    var oCustomerModel = this.loadCustomerProperties(oCustomer);
                    this.getView().setModel(oCustomerModel, "customerModel");
                }
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