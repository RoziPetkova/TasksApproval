sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "sap/ui/model/Filter",
        "sap/ui/model/FilterOperator",
        "sap/ui/core/routing/History",
        "sap/ui/model/Sorter",
        "sap/m/MessageToast",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageBox",
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, Filter, FilterOperator, History, Sorter, MessageToast, JSONModel, MessageBox, Formatter, Helper) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewInvoices', {
            formatter: Formatter,
            _bundle: null,
            _invoicesSkip: 0,
            _invoicesHasMore: true,
            _router: null, 

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatCurrency: function (value) {
                return Formatter.formatCurrency(value);
            },

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._router = this.getOwnerComponent().getRouter();

                Helper.setStickyHeader(this, "reviewInvoicesTable");
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onInvoicePress(oEvent) {
                const oInvoice = oEvent.getSource().getBindingContext("invoices").getObject();
                const encodedProductName = encodeURIComponent(oInvoice.ProductName);
                this._router.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID,
                    ProductName: encodedProductName
                });
            },

            onFilterInvoices: function (oEvent) {
                Helper.onFilter(oEvent, this, "reviewInvoicesTable", ["CustomerID", "ProductName"]);
            },

            onSortColumn: function (oEvent) {
                Helper.onSortColumn(oEvent, this, "reviewInvoicesTable");
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onCloseDialog: function () {
                Helper.onCloseDialog(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            },
        });
    }
);