sap.ui.define([
     "../utils/Constants"
], function (Constants) {
    "use strict";

    return {
        formatDate: function (dateString) {
            if (!dateString) return "";
            var date = new Date(dateString);
            return date.toLocaleDateString();
        },

        formatStatusState: function (status) {
            switch (status) {
                case Constants.OrderStatus.SHIPPED:
                    return "Success";
                case Constants.OrderStatus.PENDING:
                    return "Warning";
                case Constants.OrderStatus.DECLINED:
                    return "Error";
                default:
                    return Constants.NONE;
            }
        },

        formatShippedDate: function (shippedDate, status) {
            if (status === Constants.OrderStatus.DECLINED) {
                return Constants.NONE;
            }
            if (!shippedDate) return "";
            var date = new Date(shippedDate);
            return date.toLocaleDateString();
        },

        formatCurrency: function (value) {
            if (!value) return "0.00";
            return parseFloat(value).toFixed(2);
        },

        formatDiscount: function (value) {
            if (!value || value === 0) return "0%";
            return (value * 100).toFixed(0) + "%";
        },

        formatFax: function (value) {
            return value || "N/A";
        },

        formatRegion: function (value) {
            return value || "N/A";
        }
    };
});
