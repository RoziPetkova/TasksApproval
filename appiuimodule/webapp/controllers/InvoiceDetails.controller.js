sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Formatter, Helper) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.InvoiceDetails", {
            formatter: Formatter,
            _bundle: null,

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatCurrency: function (value) {
                return Formatter.formatCurrency(value);
            },

            formatDiscount: function (value) {
                return Formatter.formatDiscount(value);
            },

            onInit() {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("invoicedetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched: function (oEvent) {
                var sOrderID = oEvent.getParameter("arguments").OrderID;

                // Filter the products table to show only items for this order
                this.filterInvoiceProducts(sOrderID);

                // Bind the first invoice item to display header details
                this.bindInvoiceHeader(sOrderID);

                this.setStickyHeaderForProductsTable();
            },

            filterInvoiceProducts: function (sOrderID) {
                const oTable = this.byId("productsTable");
                if (!oTable) return;

                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                    const oFilter = new Filter("OrderID", FilterOperator.EQ, parseInt(sOrderID));
                    oBinding.filter([oFilter], "Application");
                }
            },

            bindInvoiceHeader: function (sOrderID) {
                const oView = this.getView();

                // Read the first invoice item to get header details
                const oModel = this.getOwnerComponent().getModel("odataModel");
                const sPath = "/Invoices";

                oView.setBusy(true);

                oModel.read(sPath, {
                    filters: [new Filter("OrderID", FilterOperator.EQ, parseInt(sOrderID))],
                    urlParameters: {
                        "$top": "1"
                    },
                    success: function (oData) {
                        if (oData.results && oData.results.length > 0) {
                            const oInvoice = oData.results[0];
                            const oInvoiceModel = this.loadInvoiceProperties(oInvoice);
                            oView.setModel(oInvoiceModel, "invoiceModel");
                        }
                        oView.setBusy(false);
                    }.bind(this),
                    error: function (oError) {
                        MessageBox.error(this._bundle.getText("failedToLoadOrderDataMessage"));
                        oView.setBusy(false);
                    }.bind(this)
                });
            },

            onNavBack() {
                Helper.onNavBack(this);
            },

            setStickyHeaderForProductsTable: function () {
                Helper.setStickyHeader(this, "productsTable");
            },

            loadInvoiceProperties(invoice) {
                return new JSONModel({
                    invoiceDetails: [
                        { label: this._bundle.getText("orderIdColumn"), value: invoice.OrderID },
                        { label: this._bundle.getText("productNameColumn"), value: invoice.ProductName },
                        { label: this._bundle.getText("customerIdColumn"), value: invoice.CustomerID },
                        { label: this._bundle.getText("customerColumn"), value: invoice.CustomerName },
                        { label: this._bundle.getText("quantityLabel"), value: invoice.Quantity },
                        { label: this._bundle.getText("unitPriceLabel"), value: Formatter.formatCurrency(invoice.UnitPrice) },
                        { label: this._bundle.getText("discountLabel"), value: Formatter.formatDiscount(invoice.Discount) },
                        { label: this._bundle.getText("extendedPriceLabel"), value: Formatter.formatCurrency(invoice.ExtendedPrice) },
                        { label: this._bundle.getText("salespersonLabel"), value: invoice.Salesperson },
                        { label: this._bundle.getText("shipperNameLabel"), value: invoice.ShipperName },
                        { label: this._bundle.getText("orderDateColumn"), value: Formatter.formatDate(invoice.OrderDate) },
                        { label: this._bundle.getText("freightLabel"), value: Formatter.formatCurrency(invoice.Freight) }
                    ]
                });
            },

            onGoToCustomerDetails: function () {
                const oInvoiceModel = this.getView().getModel("invoiceModel");
                const aInvoiceDetails = oInvoiceModel.getProperty("/invoiceDetails");

                // Find customer ID from the invoice details (we'll add it to the details)
                const oCustomerDetail = aInvoiceDetails.find(function (detail) {
                    return detail.label === this._bundle.getText("customerIdColumn");
                }.bind(this));

                if (oCustomerDetail && oCustomerDetail.value) {
                    const sCustomerId = oCustomerDetail.value;
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: sCustomerId });
                }
            },

            onHomePress: function () {
                Helper.onHomePress(this);
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onCloseDialog: function () {
                Helper.onCloseDialog(this);
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            }

        });
    }
);