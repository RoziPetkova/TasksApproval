sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
        "../utils/Helper"
    ],
    function (Controller, Helper) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.ReviewCustomers', {
            _bundle: null,

            onInit: function () {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            onAfterRendering: function () {
                Helper.setStickyHeader(this, "reviewCustomersTable");
            },

            onNavBack: function () {
                Helper.onNavBack(this);
            },

            onCustomerPress(oEvent) {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("customerdetails",
                    { CustomerID: oEvent.getSource().getBindingContext("odataModel").getObject().CustomerID });
            },

            onFilterCustomers: function (oEvent) {
                Helper.onFilter(oEvent, this, "reviewCustomersTable", ["CustomerID", "CompanyName"]);
            },

            onSortColumn: function (oEvent) {
                Helper.onSortColumn(oEvent, this, "reviewCustomersTable");
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