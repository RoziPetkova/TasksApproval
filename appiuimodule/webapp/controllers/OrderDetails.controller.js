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
                // No longer needed with ObjectListItem - semantic styling handled by control
                // ObjectListItem handles status styling automatically
                return;
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
                if (!this.approveDialog) {
                    this.approveDialog = await this.loadFragment({
                        name: "appiuimodule.views.ApproveDialog"
                    });
                }

                // Set title and icon dynamically
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.approveDialog.setTitle(bundle.getText("taskDecisionDialogTitle"));
                this.approveDialog.setIcon("sap-icon://accept");

                // Clear previous content and add approve content
                this.approveDialog.removeAllContent();
                this.approveDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.Text({
                                text: "Confirm Approval",
                                textAlign: "Center",
                                width: "100%"
                            })
                        ]
                    })
                );

                this.approveDialog.open();
            },

            onApproveConfirm: async function() {
                await this.handleApproveOrder();
                this.approveDialog.close();
            },

            onCloseDialog: function() {
                // Generic close function for all dialogs
                if (this.approveDialog && this.approveDialog.isOpen()) {
                    this.approveDialog.close();
                }
                if (this.declineDialog && this.declineDialog.isOpen()) {
                    this.declineDialog.close();
                }
                if (this.settingsDialog && this.settingsDialog.isOpen()) {
                    this.settingsDialog.close();
                }
                if (this.logoutDialog && this.logoutDialog.isOpen()) {
                    this.logoutDialog.close();
                }
            },

            async onDecline() {
                if (!this.declineDialog) {
                    this.declineDialog = await this.loadFragment({
                        name: "appiuimodule.views.DeclineDialog"
                    });
                }

                // Set title and icon dynamically
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                this.declineDialog.setTitle(bundle.getText("taskDecisionDialogTitle"));
                this.declineDialog.setIcon("sap-icon://decline");

                // Clear previous content and add decline content
                this.declineDialog.removeAllContent();
                this.declineDialog.addContent(
                    new sap.m.VBox({
                        alignItems: "Center",
                        items: [
                            new sap.m.TextArea({ 
                                id: this.createId("rejectionReasonInput"),
                                placeholder: "Rejection reason...",
                                rows: 4,
                                width: "100%"
                            })
                        ]
                    })
                );

                this.declineDialog.open();
            },

            onDeclineConfirm: async function() {
                // Get rejection reason from input
                const input = this.byId("rejectionReasonInput");
                const rejectionReason = input ? input.getValue() : "";
                
                await this.handleDeclineOrder(rejectionReason);
                this.declineDialog.close();
            },

            formatStatus: function(shippedDate) {
                return shippedDate ? "Shipped" : "Pending";
            },

            formatDate: function(dateString) {
                if (!dateString) return "";
                var date = new Date(dateString);
                return date.toLocaleDateString();
            },

            formatCustomerRowType: function(label) {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var customerIdLabel = bundle.getText("customerIdColumn");
                return (label === customerIdLabel) ? "Navigation" : "Inactive";
            },

            formatStatusColor: function(label, value) {
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var statusLabel = bundle.getText("statusLabel");
                
                if (label === statusLabel) {
                    if (value === "Shipped" || value === "Approved") {
                        return "Success";
                    } else if (value === "Pending") {
                        return "Warning";
                    } else if (value === "Declined" || value === "Rejected") {
                        return "Error";
                    }
                }
                return "None";
            },

            onCustomerRowPress: function(oEvent) {
                var oItem = oEvent.getSource();
                var oBindingContext = oItem.getBindingContext("orderModel");
                var oRowData = oBindingContext.getObject();
                
                var bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                var customerIdLabel = bundle.getText("customerIdColumn");
                
                if (oRowData.label === customerIdLabel && oRowData.value) {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: oRowData.value });
                }
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
                if (!this.settingsDialog) {
                    this.settingsDialog = await this.loadFragment({
                        name: "appiuimodule.views.SettingsDialog"
                    });
                }
                this.settingsDialog.open();
            },

            onSettingsSave: function() {
                // Placeholder for save functionality
                sap.m.MessageToast.show("Settings saved (placeholder)");
                this.settingsDialog.close();
            },

            onLogoutPress: async function() {
                if (!this.logoutDialog) {
                    this.logoutDialog = await this.loadFragment({
                        name: "appiuimodule.views.LogoutDialog"
                    });
                }
                this.logoutDialog.open();
            },

            onLogoutConfirm: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("logout");
                this.logoutDialog.close();
            },

            onHomepagePress: function() {
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("entrypanel");
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
