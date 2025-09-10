sap.ui.define(
    [
        'sap/ui/core/mvc/Controller'
    ],
    function (Controller) {
        'use strict';

        return Controller.extend('appiuimodule.controllers.Overview', {
             /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            // onInit: function () {
            //     console.log("Overview controller initialized");
            //     console.log(this.getView().getModel("tasks"));
            // },

            onPress(oEvent) {
                const oItem = oEvent.getSource();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("details", {taskId: oEvent.getSource().getBindingContext("tasks").getObject().taskId});
            }

            /**
             * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
             * (NOT before the first rendering! onInit() is used for that one!).
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onBeforeRendering: function() {
            //
            //  },

            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onAfterRendering: function() {
            //
            //  },

            /**
             * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            //  onExit: function() {
            //
            //  }
        });
    }
);
