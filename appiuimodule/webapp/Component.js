sap.ui.define(
    [
        "sap/ui/core/UIComponent",
        "sap/ui/model/odata/v2/ODataModel"
    ],
    function (UIComponent, ODataModel) {
        "use strict";

        return UIComponent.extend("appiuimodule.Component", {
            metadata: {
                interfaces: ["sap.ui.core.IAsyncContentCreation"],
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during 
             * the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // switch to Bulgarian fere if needed
                //sap.ui.getCore().getConfiguration().setLanguage("bg");

                // create the views based on the url/hash
                //this.getRouter() gets the router instance defined in your app's manifest.
                //.initialize() starts the router, enabling navigation and view handling
                // based on the URL/hash.
                const oRouter = this.getRouter();

                // Show global busy indicator before route matched
                oRouter.attachBeforeRouteMatched(function () {
                    sap.ui.core.BusyIndicator.show(0);
                });

                // Hide global busy indicator after route matched
                oRouter.attachRouteMatched(function () {
                    sap.ui.core.BusyIndicator.hide();
                });

                oRouter.initialize();

                // set data model
                const customersModel = new ODataModel({
                    serviceUrl: "https://services.odata.org/V2/Northwind/Northwind.svc/",
                    useBatch: false,       // Optional: combine multiple requests in one batch
                    defaultBindingMode: "TwoWay", // Optional: allow updates via binding
                    defaultCountMode: "None"
                });

                this.setModel(customersModel, "odataModel");
            }
        });
    }
);