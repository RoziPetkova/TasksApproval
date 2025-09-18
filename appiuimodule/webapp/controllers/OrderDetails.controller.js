sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/core/routing/History",
    ],
    function (Controller, History) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.OrderDetails", {
            /**
             * Called when a controller is instantiated and its View controls (if available) are already created.
             * Can be used to modify the View before it is displayed, to bind event handlers and do other one-time initialization.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            onInit() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("orderdetails").attachPatternMatched(this.onObjectMatched, this);
            },


            onObjectMatched: async function(oEvent) {
                var sOrderId = oEvent.getParameter("arguments").OrderID;
                var oModel = this.getOwnerComponent().getModel("orders");
                
                // Check if model exists and has data
                if (!oModel || !oModel.getProperty("/value")) {
                    // If model doesn't exist or has no data, fetch order directly from API
                    await this.loadOrderById(sOrderId);
                    return;
                }
                
                var aOrders = oModel.getProperty("/value");
                var oOrder = aOrders.find(function (order) {
                    return String(order.OrderID) === String(sOrderId);
                });
                
                // If order not found in loaded model, try fetching from API
                if (!oOrder) {
                    console.warn("Order not found in loaded model, fetching from API:", sOrderId);
                    await this.loadOrderById(sOrderId);
                    return;
                }
                
                // oOrder found in model - use it
                var oOrderModel = this.loadOrderProperties(oOrder);
                this.getView().setModel(oOrderModel, "orderModel");
                this.updateStatusStyle();
            },


            /**
             * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
             * This hook is the same one that SAPUI5 controls get after being rendered.
             * @memberOf appiuimodule.ext.overview.Overview
             */
            updateStatusStyle: function () {
                var oTable = this.byId("orderTable");
                var aItems = oTable.getItems();

                aItems.forEach(function (oItem) {
                    var aCells = oItem.getCells();
                    var sLabel = aCells[0].getText();

                    if (sLabel === "Status" || sLabel.includes("Status")) {
                        var sStatus = aCells[1].getText();
                        // Remove any previous status classes
                        clearStatysStyle(aCells);
                        // Add class based on status value
                        setNewStatusStyle(sStatus, aCells);
                    }
                });
            },

            onNavBack() {
                const oHistory = History.getInstance();
                const sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                } else {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("overview", {}, true);
                }
            },

            async onApprove() {
                this.decisionDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Set title dynamically
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.decisionDialog.setTitle(bundle.getText("taskDecisionDialogTitle"));

                // Clear previous content
                this.decisionDialog.removeAllContent();

                // Add a simple text for Approve
                this.decisionDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://accept" }),
                            new sap.m.Text({
                                text: "Confirm Approval",
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.decisionDialog.setBeginButton(new sap.m.Button({
                    text: "Confirm",
                    press: function () {
                        // handle confirm approve
                        this.decisionDialog.close();
                    }.bind(this)
                }));

                this.decisionDialog.open();
            },

            async onDecline() {
                this.decisionDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Set title dynamically
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.decisionDialog.setTitle(bundle.getText("taskDecisionDialogTitle"));

                // Clear previous content
                this.decisionDialog.removeAllContent();

                // Add a simple text for Decline
                this.decisionDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://decline" }),
                            new sap.m.Input({ placeholder: "Rejection reason..." })
                        ]
                    })
                );

                this.decisionDialog.setBeginButton(new sap.m.Button({
                    text: "Decline",
                    press: function () {
                        // handle decline approve
                        this.decisionDialog.close();
                    }.bind(this)
                }));

                this.decisionDialog.open();
            },

            formatStatus: function(shippedDate) {
                return shippedDate ? "Shipped" : "Pending";
            },

            formatDate: function(dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            onGoToCustomerDetails: function() {
                const oTaskModel = this.getView().getModel("orderModel");
                const aTaskDetails = oTaskModel.getProperty("/taskDetails");
                
                // Find customer ID from the task details
                const oCustomerDetail = aTaskDetails.find(function(detail) {
                    return detail.label === this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("customerIdColumn");
                }.bind(this));
                
                if (oCustomerDetail && oCustomerDetail.value) {
                    const customerId = oCustomerDetail.value;
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: customerId });
                }
            },

            loadOrderById: async function(orderId) {
                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$filter=OrderID eq ${orderId}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    
                    if (data.value && data.value.length > 0) {
                        const oOrder = data.value[0];
                        
                        // Add Status property
                        oOrder.Status = oOrder.ShippedDate ? "Shipped" : "Pending";
                        
                        // Set order details
                        var oOrderModel = this.loadOrderProperties(oOrder);
                        this.getView().setModel(oOrderModel, "orderModel");
                        this.updateStatusStyle();
                    } else {
                        console.error("Order not found in API:", orderId);
                        // Show error message to user
                        sap.m.MessageToast.show(`Order ${orderId} not found. This order may not exist in the system.`);
                        
                        // Navigate back or set empty model
                        this.getView().setModel(new sap.ui.model.json.JSONModel({
                            taskDetails: [
                                { label: "Error", value: `Order ${orderId} not found` },
                                { label: "Status", value: "Not Available" }
                            ]
                        }), "orderModel");
                    }
                } catch (error) {
                    console.error("Error loading order by ID:", error);
                    sap.m.MessageToast.show(`Failed to load order ${orderId}. Please try again.`);
                    
                    // Set error model
                    this.getView().setModel(new sap.ui.model.json.JSONModel({
                        taskDetails: [
                            { label: "Error", value: `Failed to load order ${orderId}` },
                            { label: "Status", value: "Error" }
                        ]
                    }), "orderModel");
                }
            },

            onHomePress: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("overview");
            },

            onSettingsPress: function() {
                sap.m.MessageToast.show("Settings functionality not implemented yet");
            },

            onLogoutPress: async function() {
                this.logoutDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.TaskDecision"
                });

                // Set title dynamically for logout
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.logoutDialog.setTitle(bundle.getText("logoutTitle"));

                // Clear previous content
                this.logoutDialog.removeAllContent();

                // Add logout confirmation content
                this.logoutDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://log" }),
                            new sap.m.Text({
                                text: bundle.getText("logoutConfirmationMessage"),
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.logoutDialog.setBeginButton(new sap.m.Button({
                    text: bundle.getText("confirmLogoutButton"),
                    press: function () {
                        const oRouter = this.getOwnerComponent().getRouter();
                        oRouter.navTo("logout");
                        this.logoutDialog.close();
                    }.bind(this)
                }));

                this.logoutDialog.setEndButton(new sap.m.Button({
                    text: bundle.getText("dialogCloseButtonText"),
                    press: function () {
                        this.logoutDialog.close();
                    }.bind(this)
                }));

                this.logoutDialog.open();
            },

            loadOrderProperties(order) {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

                return new sap.ui.model.json.JSONModel({
                    taskDetails: [
                        { label: bundle.getText("orderIdColumn"), value: order.OrderID },
                        { label: bundle.getText("taskTypeLabel"), value: "Order" },
                        { label: bundle.getText("customerIdColumn"), value: order.CustomerID },
                        { label: bundle.getText("orderDateColumn"), value: this.formatDate(order.OrderDate) },
                        { label: bundle.getText("shippedDateLabel"), value: this.formatDate(order.ShippedDate) },
                        { label: bundle.getText("countryLabel"), value: order.ShipCountry },
                        { label: bundle.getText("cityLabel"), value: order.ShipCity },
                        { label: bundle.getText("statusLabel"), value: order.Status }
                    ]
                });
            },
        });
    }
);
function setNewStatusStyle(sStatus, aCells) {
    if (sStatus === "Pending") {
        aCells[1].addStyleClass("statusPending");
    } else if (sStatus === "Shipped" || sStatus === "Approved") {
        aCells[1].addStyleClass("statusApproved");
    } else if (sStatus === "Rejected") {
        aCells[1].addStyleClass("statusRejected");
    }
}

function clearStatysStyle(aCells) {
    aCells[1].removeStyleClass("statusPending");
    aCells[1].removeStyleClass("statusApproved");
    aCells[1].removeStyleClass("statusRejected");
}
