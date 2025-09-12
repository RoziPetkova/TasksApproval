sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
    ],
    function (Controller, History) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.InvoiceDetails", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.controllers.InvoiceDetails
             */
            onInit() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("invoicedetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched(oEvent) {
                var sOrderID = oEvent.getParameter("arguments").OrderID;
                var sProductName = decodeURIComponent(oEvent.getParameter("arguments").ProductName);
                var oModel = this.getOwnerComponent().getModel("invoices");
                var aInvoices = oModel.getProperty("/invoices");
                var oInvoice = aInvoices.find(function (invoice) {
                    return String(invoice.OrderID) === String(sOrderID) && invoice.ProductName === sProductName;
                });
                
                if (oInvoice) {
                    // Set it to a local model for binding
                    var oInvoiceModel = this.loadInvoiceProperties(oInvoice);
                    this.getView().setModel(oInvoiceModel, "invoiceModel");
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

            formatCurrency: function(value) {
                if (!value) return "0.00";
                return parseFloat(value).toFixed(2);
            },

            formatDate: function(dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            loadInvoiceProperties(invoice) {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                return new sap.ui.model.json.JSONModel({
                    invoiceDetails: [
                        { label: bundle.getText("orderIdColumn"), value: invoice.OrderID },
                        { label: bundle.getText("productNameColumn"), value: invoice.ProductName },
                        { label: bundle.getText("customerColumn"), value: invoice.CustomerName },
                        { label: bundle.getText("quantityLabel"), value: invoice.Quantity },
                        { label: bundle.getText("unitPriceLabel"), value: this.formatCurrency(invoice.UnitPrice) },
                        { label: bundle.getText("discountLabel"), value: (invoice.Discount * 100).toFixed(1) + "%" },
                        { label: bundle.getText("extendedPriceLabel"), value: this.formatCurrency(invoice.ExtendedPrice) },
                        { label: bundle.getText("salespersonLabel"), value: invoice.Salesperson },
                        { label: bundle.getText("shipperNameLabel"), value: invoice.ShipperName },
                        { label: bundle.getText("orderDateColumn"), value: this.formatDate(invoice.OrderDate) },
                        { label: bundle.getText("freightLabel"), value: this.formatCurrency(invoice.Freight) }
                    ]
                });
            },


        });
    }
);