sap.ui.define(
    [
        "sap/ui/core/mvc/Controller"
    ],
    function (Controller) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.Logout", {
            
            onInit: function () {
            },
            
            onLoginAgain: function () {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel", {}, true);
            }

        });
    }
);