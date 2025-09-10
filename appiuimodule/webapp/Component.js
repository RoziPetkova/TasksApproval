sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/model/json/JSONModel"
    ],
    function (UIComponent, JSONModel) {
        "use strict";

        return UIComponent.extend("appiuimodule.Component", {
            metadata: {
                interfaces: ["sap.ui.core.IAsyncContentCreation"],
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // Global JSON model
                //const oModel = new JSONModel("data.json");
                //this.setModel(oModel, "tasks");

                // create the views based on the url/hash
                //this.getRouter() gets the router instance defined in your app’s manifest.
                //.initialize() starts the router, enabling navigation and view handling
                // based on the URL/hash.
                this.getRouter().initialize();
            }
        });
    }
);