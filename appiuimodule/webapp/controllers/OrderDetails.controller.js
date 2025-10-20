sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "../utils/Formatter",
        "../utils/Helper"
    ],
    function (Controller, JSONModel, MessageToast, MessageBox, Formatter, Helper) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.OrderDetails", {
            formatter: Formatter,
            _bundle: null,

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatStatusState: function (status) {
                return Formatter.formatStatusState(status);
            },

            onInit() {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("orderdetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched: async function (oEvent) {
                var sOrderId = oEvent.getParameter("arguments").OrderID;
                var oModel = this.getOwnerComponent().getModel("orders");

                if (!oModel || !oModel.getProperty("/value")) {
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
            },

            onNavBack() {
                Helper.onNavBack(this);
            },

            async onApprove() {
                if (!this.approveDialog) {
                    this.approveDialog = await this.loadFragment({
                        name: "appiuimodule.views.ApproveDialog"
                    });
                }

                this.approveDialog.open();
            },

            onApproveConfirm: async function () {
                await this.handleApproveOrder();
                this.approveDialog.close();
            },

            onCloseDialog: function () {
                Helper.onCloseDialog(this);
            },

            async onDecline() {
                if (!this.declineDialog) {
                    this.declineDialog = await this.loadFragment({
                        name: "appiuimodule.views.DeclineDialog"
                    });
                }

                this.declineDialog.open();
            },

            onDeclineConfirm: async function () {
                const input = this.byId("rejectionReasonInput");
                const rejectionReason = input ? input.getValue() : "";

                // Clear the input for next time
                if (input) {
                    input.setValue("");
                }

                await this.handleDeclineOrder(rejectionReason);
                this.declineDialog.close();
            },

           

            onCustomerRowPress: function (oEvent) {
                var oItem = oEvent.getSource();
                var oBindingContext = oItem.getBindingContext("orderModel");
                var oRowData = oBindingContext.getObject();

                var customerIdLabel = this._bundle.getText("customerIdColumn");

                if (oRowData.label === customerIdLabel && oRowData.value) {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: oRowData.value });
                }
            },

            onGoToCustomerDetails: function () {
                const oTaskModel = this.getView().getModel("orderModel");
                const aTaskDetails = oTaskModel.getProperty("/taskDetails");

                // Find customer ID from the task details
                const oCustomerDetail = aTaskDetails.find(function (detail) {
                    return detail.label === this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("customerIdColumn");
                }.bind(this));

                if (oCustomerDetail && oCustomerDetail.value) {
                    const customerId = oCustomerDetail.value;
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: customerId });
                }
            },

            loadOrderById: async function (orderId) {
                const card = this.byId("orderCard");
                if (card) {
                    card.setBusyIndicatorDelay(0);
                    card.setBusy(true);
                }
                try {
                    const response = await fetch(`https://services.odata.org/V4/Northwind/Northwind.svc/Orders?$filter=OrderID eq ${orderId}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();

                    if (data.value && data.value.length > 0) {
                        const oOrder = data.value[0];

                        oOrder.Status = oOrder.ShippedDate ? "Shipped" : "Pending";

                        var oOrderModel = this.loadOrderProperties(oOrder);
                        this.getView().setModel(oOrderModel, "orderModel");
                    } else {
                        console.error("Order not found in API:", orderId);
                        MessageBox.error(this._bundle.getText("orderNotFoundMessage", [orderId]));

                        this.getView().setModel(new JSONModel({
                            taskDetails: [
                                { label: this._bundle.getText("errorLabel"), value: this._bundle.getText("orderNotFoundLabel", [orderId]) },
                                { label: this._bundle.getText("statusLabel"), value: this._bundle.getText("notAvailableLabel") }
                            ]
                        }), "orderModel");
                    }
                } catch (error) {
                    console.error("Error loading order by ID:", error);
                    MessageBox.error(this._bundle.getText("failedToLoadOrderMessage", [orderId]));

                    this.getView().setModel(new JSONModel({
                        taskDetails: [
                            { label: this._bundle.getText("errorLabel"), value: this._bundle.getText("failedToLoadOrderLabel", [orderId]) },
                            { label: this._bundle.getText("statusLabel"), value: this._bundle.getText("errorStatusLabel") }
                        ]
                    }), "orderModel");
                } finally {
                    card.setBusy(false);
                }
            },

            onHomePress: function () {
                Helper.onHomePress(this);
            },

            onSettingsPress: async function () {
                await Helper.onSettingsPress(this);
            },

            onSettingsSave: function () {
                Helper.onSettingsSave(this);
            },

            onLogoutPress: async function () {
                await Helper.onLogoutPress(this);
            },

            onLogoutConfirm: function () {
                Helper.onLogoutConfirm(this);
            },

            onHomepagePress: function () {
                Helper.onHomepagePress(this);
            },

            handleApproveOrder: async function () {
                try {
                    const oOrderModel = this.getView().getModel("orderModel");
                    const currentOrderId = oOrderModel.getProperty("/taskDetails/0/value"); // OrderID is first detail

                    const updatedOrderData = oOrderModel.getData().taskDetails;

                    updatedOrderData.forEach(detail => {
                        if (detail.label.includes("Shipped Date") || detail.label.includes("shippedDate")) {
                            detail.value = Formatter.formatDate(new Date().toISOString());
                        }
                        if (detail.label.includes("Status") || detail.label.includes("status")) {
                            detail.value = "Shipped";
                        }
                    });

                    oOrderModel.setData({ taskDetails: updatedOrderData });

                    const allOrdersModel = this.getOwnerComponent().getModel("orders");
                    this.updateOrdersModel(allOrdersModel, updatedOrderData, "Shipped");

                    MessageToast.show(this._bundle.getText("orderApprovedMessage", [currentOrderId]));

                } catch (error) {
                    console.error("Error approving order:", error);
                    MessageBox.error(this._bundle.getText("failedToApproveOrderMessage"));
                }
            },

            handleDeclineOrder: async function (rejectionReason) {
                try {
                    const oOrderModel = this.getView().getModel("orderModel");

                    const updatedOrderData = oOrderModel.getData().taskDetails;

                    updatedOrderData.forEach(detail => {
                        if (detail.label.includes("Shipped Date")) {
                            detail.value = "None";
                        }
                        if (detail.label.includes("Status") || detail.label.includes("status")) {
                            detail.value = "Declined";
                        }
                    });

                    updatedOrderData.push({
                        label: this._bundle.getText("rejectionReasonLabel"),
                        value: rejectionReason || this._bundle.getText("noReasonProvidedLabel")
                    });

                    oOrderModel.setData({ taskDetails: updatedOrderData });

                    const allOrdersModel = this.getOwnerComponent().getModel("orders");
                    this.updateOrdersModel(allOrdersModel, updatedOrderData, "Declined");

                    const message = rejectionReason
                        ? this._bundle.getText("orderDeclinedWithReasonMessage", [updatedOrderData[0].value, rejectionReason])
                        : this._bundle.getText("orderDeclinedMessage", [updatedOrderData[0].value]);
                    MessageToast.show(message);

                } catch (error) {
                    console.error("Error declining order:", error);
                    MessageBox.error(this._bundle.getText("failedToDeclineOrderMessage"));
                }
            },

            updateOrdersModel(allOrdersModel, updatedOrderData, status) {
                const allOrders = allOrdersModel.getProperty("/value");
                if (allOrders) {
                    const orderIndex = allOrders.findIndex(order => String(order.OrderID) === String(updatedOrderData[0].value));
                    if (orderIndex !== -1) {
                        if (status === "Declined") {
                            allOrders[orderIndex].ShippedDate = updatedOrderData[4].value;
                            allOrders[orderIndex].Status = updatedOrderData[7].value;
                            allOrders[orderIndex].RejectionReason = updatedOrderData[8].value || "No reason provided"
                        } else if (status === "Shipped") {
                            allOrders[orderIndex].ShippedDate = updatedOrderData[4].value;
                            allOrders[orderIndex].Status = updatedOrderData[7].value;
                        }
                        allOrdersModel.setProperty("/value", allOrders);
                    }
                }
            },

            loadOrderProperties(order) {
                const taskDetails = [
                    { label: this._bundle.getText("orderIdColumn"), value: order.OrderID },
                    { label: this._bundle.getText("taskTypeLabel"), value: this._bundle.getText("orderTaskTypeValue") },
                    { label: this._bundle.getText("customerIdColumn"), value: order.CustomerID },
                    { label: this._bundle.getText("orderDateColumn"), value: Formatter.formatDate(order.OrderDate) },
                    { label: this._bundle.getText("shippedDateLabel"), value: Formatter.formatDate(order.ShippedDate) },
                    { label: this._bundle.getText("countryLabel"), value: order.ShipCountry },
                    { label: this._bundle.getText("cityLabel"), value: order.ShipCity },
                    { label: this._bundle.getText("statusLabel"), value: order.Status }
                ];

                if (order.RejectionReason) {
                    taskDetails.push({
                        label: this._bundle.getText("rejectionReasonLabel"),
                        value: order.RejectionReason
                    });
                }

                return new JSONModel({
                    taskDetails: taskDetails
                });
            },

            formatCustomerRowType: function (label) {
                var customerIdLabel = this._bundle.getText("customerIdColumn");
                return (label === customerIdLabel) ? "Navigation" : "Inactive";
            },

            formatStatusColor: function (label, value) {
                var statusLabel = this._bundle.getText("statusLabel");
                if (label === statusLabel) {
                    return Formatter.formatStatusState(value);
                }
                return "None";
            },
        });
    }
);