sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
        "sap/m/MessageToast",
        "sap/m/MessageBox",
        "../utils/Formatter",
        "../utils/Helper",
        "../utils/Constants"
    ],
    function (Controller, JSONModel, MessageToast, MessageBox, Formatter, Helper, Constants) {
        "use strict";

        return Controller.extend("appiuimodule.controllers.OrderDetails", {
            formatter: Formatter,
            _bundle: null,

            onInit() {
                this._bundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                const oRouter = this.getOwnerComponent().getRouter();
                oRouter.getRoute("orderdetails").attachPatternMatched(this.onObjectMatched, this);
            },

            onObjectMatched: async function (oEvent) {
                var sOrderId = oEvent.getParameter("arguments").OrderID;
                var oModel = this.getOwnerComponent().getModel("orders");

                var aOrders = oModel.getData();
                var oOrder = aOrders.find(function (order) {
                    return String(order.OrderID) === String(sOrderId);
                });

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

            onGoToCustomerDetails: function () {
                const oOrderModel = this.getView().getModel("orderModel");
                const customerId = oOrderModel.getProperty("/CustomerID");

                if (customerId) {
                    const oRouter = this.getOwnerComponent().getRouter();
                    oRouter.navTo("customerdetails", { CustomerID: customerId });
                }
            },

            handleApproveOrder: async function () {
                try {
                    const oOrderModel = this.getView().getModel("orderModel");
                    const currentOrder = oOrderModel.getData();

                    oOrderModel.setProperty("/ShippedDate", new Date().toISOString());
                    oOrderModel.setProperty("/Status", Constants.OrderStatus.SHIPPED);

                    this.updateAllOrdersModel(currentOrder);
                    MessageToast.show(this._bundle.getText("orderApprovedMessage", [currentOrder.OrderID]));

                } catch (error) {
                    MessageBox.error(this._bundle.getText("failedToApproveOrderMessage"));
                }
            },

            handleDeclineOrder: async function (rejectionReason) {
                try {
                    const oOrderModel = this.getView().getModel("orderModel");
                    const currentOrder = oOrderModel.getData();

                    oOrderModel.setProperty("/ShippedDate", null);
                    oOrderModel.setProperty("/Status", Constants.OrderStatus.DECLINED);

                    const reason = rejectionReason || this._bundle.getText("noReasonProvidedLabel");
                    oOrderModel.setProperty("/RejectionReason", reason);

                    this.updateAllOrdersModel(currentOrder);

                    const message = rejectionReason
                        ? this._bundle.getText("orderDeclinedWithReasonMessage", [currentOrder.OrderID, rejectionReason])
                        : this._bundle.getText("orderDeclinedMessage", [currentOrder.OrderID]);
                    MessageToast.show(message);

                } catch (error) {
                    MessageBox.error(this._bundle.getText("failedToDeclineOrderMessage"));
                }
            },

            updateAllOrdersModel(currentOrder) {
                const allOrdersModel = this.getOwnerComponent().getModel("orders");
                const allOrders = allOrdersModel.getData();

                const orderIndex = allOrders.findIndex(order => String(order.OrderID) === String(currentOrder.OrderID));
                if (orderIndex !== -1) {
                    // Update the order at its index in the array
                    allOrdersModel.setProperty(`/${orderIndex}`, currentOrder);
                }
            },

            loadOrderProperties(order) {
                // Store the order object directly in the model
                return new JSONModel(order);
            },

            formatDate: function (dateString) {
                return Formatter.formatDate(dateString);
            },

            formatStatusState: function (status) {
                return Formatter.formatStatusState(status);
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

        });
    }
);