sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/m/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (MessageToast, History, mobileLibrary, Filter, FilterOperator) {
    "use strict";

    return {
        setStickyHeader: function (oController, sTableId) {
            const Sticky = mobileLibrary.Sticky;
            const oTable = oController.byId(sTableId);
            if (oTable) {
                oTable.setSticky([Sticky.ColumnHeaders]);
            }
        },

        onNavBack: function (oController, defaultRoute) {
            const oHistory = History.getInstance();
            const sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                const oRouter = oController.getOwnerComponent().getRouter();
                oRouter.navTo(defaultRoute || "overview", {}, true);
            }
        },
        onSettingsPress: async function (oController) {
            if (!oController.settingsDialog) {
                oController.settingsDialog = await oController.loadFragment({
                    name: "appiuimodule.views.SettingsDialog"
                });
            }
            oController.settingsDialog.open();
        },

        onLogoutPress: async function (oController) {
            if (!oController.logoutDialog) {
                oController.logoutDialog = await oController.loadFragment({
                    name: "appiuimodule.views.LogoutDialog"
                });
            }
            oController.logoutDialog.open();
        },

        onSettingsSave: function (oController) {
            const bundle = oController.getOwnerComponent().getModel("i18n").getResourceBundle();
            MessageToast.show(bundle.getText("settingsSavedMessage"));
            oController.settingsDialog.close();
        },

        onCloseDialog: function (oController) {
            if (oController.settingsDialog && oController.settingsDialog.isOpen()) {
                oController.settingsDialog.close();
            }
            if (oController.logoutDialog && oController.logoutDialog.isOpen()) {
                oController.logoutDialog.close();
            }
            if (oController.approveDialog && oController.approveDialog.isOpen()) {
                oController.approveDialog.close();
            }
            if (oController.declineDialog && oController.declineDialog.isOpen()) {
                oController.declineDialog.close();
            }
        },

        onLogoutConfirm: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("logout");
            oController.logoutDialog.close();
        },

        onHomepagePress: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("entrypanel");
        },

        onHomePress: function (oController) {
            const oRouter = oController.getOwnerComponent().getRouter();
            oRouter.navTo("overview");
        },

        /**
         * Generic filter function for table search
         * @param {sap.ui.base.Event} oEvent - The search event
         * @param {sap.ui.core.mvc.Controller} oController - The controller instance
         * @param {string} sTableId - The ID of the table to filter
         * @param {Array<string>} aFieldNames - Array of field names to filter on
         */
        onFilter: function (oEvent, oController, sTableId, aFieldNames) {
            const sQuery = oEvent.getParameter("query");
            const oTable = oController.byId(sTableId);
            const oBinding = oTable.getBinding("items");

            if (sQuery && sQuery.trim()) {
                const aFilters = aFieldNames.map(function(sFieldName) {
                    return new Filter(sFieldName.trim(), FilterOperator.Contains, sQuery);
                });

                const oFilter = new Filter({
                    filters: aFilters,
                    and: false
                });
                oBinding.filter(oFilter, "Application");
            } else {
                oBinding.filter([], "Application");
            }
        }
    };
});
