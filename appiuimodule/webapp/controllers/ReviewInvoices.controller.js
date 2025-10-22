sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, Formatter, Helper) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewInvoices', {
            formatter: Formatter,

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this._router = this.getOwnerComponent().getRouter();

                Helper.setStickyHeader(this, "reviewInvoicesTable");
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onInvoicePress(oEvent) {
                const oInvoice = oEvent.getSource().getBindingContext("odataModel").getObject();
                this._router.navTo("invoicedetails", {
                    OrderID: oInvoice.OrderID
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

            onCloseDialog: function (oEvent) {
                oEvent.getSource().getParent().close();
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