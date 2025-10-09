sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function (Controller) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.Logout", {
            
            onInit: function () {
                // Optional: You could add animations or effects here
            },

            onLoginAgain: function () {
                // Navigate back to the overview page (simulate login)
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel", {}, true);
            }

        });
    }
);