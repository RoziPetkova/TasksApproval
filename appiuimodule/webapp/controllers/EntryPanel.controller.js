sap.ui.define(
    [
        'sap/ui/core/mvc/Controller',
         "sap/m/MessageToast",
         "sap/ui/model/json/JSONModel"
    ],
    function (Controller, MessageToast, JSONModel) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.EntryPanel', {

            onInit: function () {
                // Initialize entry panel
                // Set view model to hide homepage button since we're already on the homepage
                const oViewModel = new JSONModel({
                    showHomepageButton: false
                });
                this.getView().setModel(oViewModel, "view");
            },

            onReviewOrdersPress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("revieworders");
            },

            onReviewCustomersPress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("reviewcustomers");
            },

            onReviewInvoicesPress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("reviewinvoices");
            },

            onOverviewPress: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            // Settings and Logout dialog handlers
            onSettingsPress: async function () {
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();

            //or the alternative way with .then
            //    if (!this.settingsDialog) {
            //     this.loadFragment({
            //         name: "appiuimodule.views.SettingsDialog"
            //     }).then((dialog) => {   // ← "dialog" comes from here
            //         this.settingsDialog = dialog;
            //         this.settingsDialog.open();
            //     });
            //     } else {
            //         this.settingsDialog.open();
            //     }
        },

            onLogoutPress: async function () {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();

            //     if(!this.logoutDialog) {
            //        this.loadFragment({
            //            name: "appiuimodule.views.LogoutDialog"
            //        }).then((dialog) => {   // ← "dialog" comes from here
            //            this.logoutDialog = dialog;
            //            this.logoutDialog.open();
            //        });
            //    }
            },

            onSettingsSave: function () {
                MessageToast.show("Saves");
                this.settingsDialog.close();
            },

            onCloseDialog: function () {
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            onLogoutConfirm: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },
        });
    }
);