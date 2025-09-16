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

                sap.ui.getCore().getConfiguration().setLanguage("en"); // switch to Bulgarian

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
            _loadOrdersModel: async function () {
                var oOrdersModel = new JSONModel();

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$top=100");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    // Add Status property to each order
                    if (data.value) {
                        data.value.forEach(function (order) {
                            //  if ShippedDate exists, status is "Shipped", otherwise "Pending"
                            order.Status = order.ShippedDate ? "Shipped" : "Pending";
                        });
                    }
                    
                    oOrdersModel.setData(data);
                } catch (error) {
                    console.error("Error loading orders data:", error);
                }

                this.setModel(oOrdersModel, "orders");
            },

            /**
             * Load the customers JSON model
             * @private
             */
            // _loadCustomersModel: function () {
            //     var oCustomersModel = new JSONModel();
            //     oCustomersModel.loadData("customers.json");
            //     this.setModel(oCustomersModel, "customers");
            // },

            _loadCustomersModel: async function () {
                var oCustomersModel = new JSONModel();

                try {
                    const response = await
                        fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Customers?$top=10");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    oCustomersModel.setData(data);
                } catch (error) {
                    console.error("Error loading customers data: ", error);
                }

                this.setModel(oCustomersModel, "customers");
            },

            // _loadCustomersModel: function () {
            //     var oCustomersModel = new
            //         sap.ui.model.odata.v4.ODataModel({
            //             serviceUrl: "Northwind.svc/",
            //             synchronizationMode: "None"
            //         });

            // this.setModel(oCustomersModel, "customers");
        // },

            // _loadCustomersModel: function () {
            //     var oCustomersModel = new
            //         sap.ui.model.odata.v4.ODataModel({
            //             serviceUrl: "Northwind.svc/",
            //             synchronizationMode: "None"
            //         });
            //     this.setModel(oCustomersModel, "Customers");
            //     console.log(oCustomersModel);
            // },
            /**
             * Load the invoices JSON model
             * @private
             */
            _loadInvoicesModel: async function () {
                var oInvoicesModel = new JSONModel();

                try {
                    const response = await fetch("https://services.odata.org/V4/Northwind/Northwind.svc/Invoices?$top=10");
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    oInvoicesModel.setData(data);
                } catch (error) {
                    console.error("Error loading invoices data:", error);
                }

                this.setModel(oInvoicesModel, "invoices");
            }
        });
    }
);