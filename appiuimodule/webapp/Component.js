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

                // Load models programmatically
                this._loadOrdersModel();
                this._loadCustomersModel();
                this._loadInvoicesModel();

                // create the views based on the url/hash
                //this.getRouter() gets the router instance defined in your app's manifest.
                //.initialize() starts the router, enabling navigation and view handling
                // based on the URL/hash.

                this.getRouter().initialize();
            },

            /**
             * Load the orders JSON model
             * @private
             */
            _loadOrdersModel: function () {
                var oOrdersModel = new JSONModel();
                oOrdersModel.loadData("data.json");
                this.setModel(oOrdersModel, "orders");
            },

            /**
             * Load the customers JSON model
             * @private
             */
            _loadCustomersModel: function () {
                var oCustomersModel = new JSONModel();
                oCustomersModel.loadData("customers.json");
                this.setModel(oCustomersModel, "customers");
            },

            /**
             * Load the invoices JSON model
             * @private
             */
            _loadInvoicesModel: function () {
                var oInvoicesModel = new JSONModel();
                oInvoicesModel.loadData("invoices.json");
                this.setModel(oInvoicesModel, "invoices");
            }
        });
    }
);