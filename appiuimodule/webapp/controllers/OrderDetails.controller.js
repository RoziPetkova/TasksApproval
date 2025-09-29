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
                    name: "appiuimodule.views.CoreDialog"
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
                    press: async function () {
                        await this.handleApproveOrder();
                        this.decisionDialog.close();
                    }.bind(this)
                }));

                this.decisionDialog.open();
            },

            async onDecline() {
                this.decisionDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.CoreDialog"
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
                            new sap.ui.core.Icon({ src: "sap-icon://cancel" }),
                            new sap.m.Input({ placeholder: "Rejection reason..." })
                        ]
                    })
                );

                this.decisionDialog.setBeginButton(new sap.m.Button({
                    text: "Decline",
                    press: async function () {
                        // Get rejection reason from input
                        const vboxContent = this.decisionDialog.getContent()[0];
                        const input = vboxContent.getItems()[1]; // Input is the second item
                        const rejectionReason = input.getValue();
                        
                        await this.handleDeclineOrder(rejectionReason);
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

            onSettingsPress: async function () {
                this.settingsDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.CoreDialog"
                });

                // Set title dynamically for settings
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.settingsDialog.setTitle("Settings");

                // Clear previous content
                this.settingsDialog.removeAllContent();

                // Add settings placeholder content
                this.settingsDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.ui.core.Icon({ src: "sap-icon://settings" }),
                            new sap.m.Text({
                                text: "Some settings should be manipulated here... to be implemented.",
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.settingsDialog.setBeginButton(new sap.m.Button({
                    text: "Save",
                    press: function () {
                        // Placeholder for save functionality
                        sap.m.MessageToast.show("Settings saved (placeholder)");
                        this.settingsDialog.close();
                    }.bind(this)
                }));

                this.settingsDialog.setEndButton(new sap.m.Button({
                    text: "Close",
                    press: function () {
                        this.settingsDialog.close();
                    }.bind(this)
                }));

                this.settingsDialog.open();
            },

            onLogoutPress: async function() {
                this.logoutDialog ??= await this.loadFragment({
                    name: "appiuimodule.views.CoreDialog"
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

            handleApproveOrder: async function() {
                try {
                    // Get current order data
                    const oOrderModel = this.getView().getModel("orderModel");
                    const currentOrderId = oOrderModel.getProperty("/taskDetails/0/value"); // OrderID is first detail
                    
                    // Update local model: set ShippedDate to current date, Status to Shipped
                    const currentDate = new Date().toISOString();
                    const updatedOrderData = oOrderModel.getData();
                    
                    // Find and update the ShippedDate and Status in taskDetails
                    updatedOrderData.taskDetails.forEach(detail => {
                        if (detail.label.includes("Shipped Date") || detail.label.includes("shippedDate")) {
                            detail.value = this.formatDate(currentDate);
                        }
                        if (detail.label.includes("Status") || detail.label.includes("status")) {
                            detail.value = "Shipped";
                        }
                    });
                    
                    // Update the model
                    oOrderModel.setData(updatedOrderData);
                    
                    // Also update the orders model in Component if available
                    const oOrdersModel = this.getOwnerComponent().getModel("orders");
                    if (oOrdersModel) {
                        const orders = oOrdersModel.getProperty("/value") || [];
                        const orderToUpdate = orders.find(order => String(order.OrderID) === String(currentOrderId));
                        if (orderToUpdate) {
                            orderToUpdate.ShippedDate = currentDate;
                            orderToUpdate.Status = "Shipped";
                            oOrdersModel.setProperty("/value", orders);
                        }
                    }
                    
                    // Show success message
                    sap.m.MessageToast.show(`Order ${currentOrderId} has been approved and shipped!`);
                    
                } catch (error) {
                    console.error("Error approving order:", error);
                    sap.m.MessageToast.show("Failed to approve order. Please try again.");
                }
            },

            handleDeclineOrder: async function(rejectionReason) {
                try {
                    // Get current order data
                    const oOrderModel = this.getView().getModel("orderModel");
                    const currentOrderId = oOrderModel.getProperty("/taskDetails/0/value"); // OrderID is first detail
                
                    // Since Northwind API is read-only, we simulate the API call                   
                    // Update local model: set ShippedDate to null, Status to Declined
                    const updatedOrderData = oOrderModel.getData();
                    
                    // Find and update the ShippedDate and Status in taskDetails
                    updatedOrderData.taskDetails.forEach(detail => {
                        if (detail.label.includes("Shipped Date")) {
                            detail.value = ""; // Set to empty for declined orders
                        }
                        if (detail.label.includes("Status") || detail.label.includes("status")) {
                            detail.value = "Declined";
                        }
                    });
                    
                    // Update the model
                    oOrderModel.setData(updatedOrderData);
                    
                    // Also update the orders model in Component if available
                    const oOrdersModel = this.getOwnerComponent().getModel("orders");
                    if (oOrdersModel) {
                        const orders = oOrdersModel.getProperty("/value") || [];
                        const orderToUpdate = orders.find(order => String(order.OrderID) === String(currentOrderId));
                        if (orderToUpdate) {
                            orderToUpdate.ShippedDate = null;
                            orderToUpdate.Status = "Declined";
                            oOrdersModel.setProperty("/value", orders);
                        }
                    }
                    
                    // Show success message
                    const message = rejectionReason 
                        ? `Order ${currentOrderId} has been declined. Reason: ${rejectionReason}`
                        : `Order ${currentOrderId} has been declined.`;
                    sap.m.MessageToast.show(message);
                    
                } catch (error) {
                    console.error("Error declining order:", error);
                    sap.m.MessageToast.show("Failed to decline order. Please try again.");
                }
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
    } else if (sStatus === "Rejected" || sStatus === "Declined") {
        aCells[1].addStyleClass("statusRejected");
    }
}

function clearStatysStyle(aCells) {
    aCells[1].removeStyleClass("statusPending");
    aCells[1].removeStyleClass("statusApproved");
    aCells[1].removeStyleClass("statusRejected");
}
