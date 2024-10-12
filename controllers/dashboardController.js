const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const Product = require("../models/productModel");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const Wallet = require("../models/walletModel");
const moment = require('moment');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const loadAdminHome = async(req,res)=>{ 
    try {
        const userData = await User.findById({_id: req.session.user_id});
        const { sortOption="yearly", startDate, endDate } = req.query;
        // Ensure startDate and endDate are valid
        const startDateValue = startDate || ''; // Get start date from query
        const endDateValue = endDate || ''; // Get end date from query
        // Define match condition for date filtering
        let matchCondition = { Status: "Placed" };  // Only select orders with the "Placed" status

        // Setting date range based on the selected sort option
        if (sortOption === 'daily') {
            matchCondition.PlacedAt = {
                $gte: moment().startOf('day').toDate(),
                $lt: moment().endOf('day').toDate()
            };
        } else if (sortOption === 'weekly') {
            matchCondition.PlacedAt = {
                $gte: moment().startOf('week').toDate(),
                $lt: moment().endOf('week').toDate()
            };
        } else if (sortOption === 'monthly') {
            matchCondition.PlacedAt = {
                $gte: moment().startOf('month').toDate(),
                $lt: moment().endOf('month').toDate()
            };
        } else if (sortOption === 'yearly') {
            matchCondition.PlacedAt = {
                $gte: moment().startOf('year').toDate(),
                $lt: moment().endOf('year').toDate()
            };
        } else if (sortOption === 'custom' && startDate && endDate) {
            matchCondition.PlacedAt = {
                $gte: new Date(startDate),
                $lt: new Date(endDate)
            };
        }
    
        const salesData = await Order.aggregate([
            { 
                $match: matchCondition  // Only select orders with the "Placed" status
            },
            {
                $lookup: {
                    from: "coupons",  // Assuming the collection is named "coupons"
                    localField: "AppliedCoupon",
                    foreignField: "CouponCode",  // CouponCode field in coupons collection
                    as: "CouponDetails"
                }
            },
            {
                $project: {
                    OrderId: 1,
                    "BillingName": "$Address.FullName",
                    PlacedAt: 1,
                    AppliedCoupon: 1,
                    ActualTotalPrice: 1,  // The price after applying the offer but before coupon
                    TotalPrice: 1,  // Final price after both offer and coupon
                    PriceWithoutDedection: 1,  // Original price before any deductions
                    PaymentMethod: 1,
        
                    // Coupon Deduction: ActualTotalPrice - TotalPrice
                    CouponDeduction: {
                        $cond: {
                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Offer Deduction: PriceWithoutDedection - ActualTotalPrice
                    OfferDeduction: {
                        $cond: {
                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Final Price: TotalPrice after applying both Offer and Coupon Deductions
                    FinalPrice: {
                        $subtract: [
                            "$TotalPrice",
                            {
                                $add: [
                                    {
                                        $cond: {
                                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            else: 0
                                        }
                                    },
                                    {
                                        $cond: {
                                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                                            else: 0
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: "$FinalPrice" },
                    totalDiscounts: { 
                        $sum: {
                            $add: [
                                "$CouponDeduction",
                                "$OfferDeduction"
                            ]
                        }
                    },
                    orders: { $push: "$$ROOT" }  // Push individual orders into the output
                }
            }
        ]);
        
    
        res.render('index', {
            salesData: salesData[0] || {},
            orders: salesData[0]?.orders || [],
            admin:userData,
            sortOption,
            startDateValue, 
            endDateValue,
        });
    } catch (error) {
        console.log(error.message);
    }
}


const generateExcel = async (req, res) => {
    const { sortOption = "yearly", startDate, endDate } = req.query;

    // Ensure startDate and endDate are valid
    const startDateValue = startDate || ''; // Get start date from query
    const endDateValue = endDate || ''; // Get end date from query

    // Define match condition for date filtering
    let matchCondition = { Status: "Placed" }; // Only select orders with the "Placed" status

    // Setting date range based on the selected sort option
    if (sortOption === 'daily') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('day').toDate(),
            $lt: moment().endOf('day').toDate()
        };
    } else if (sortOption === 'weekly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('week').toDate(),
            $lt: moment().endOf('week').toDate()
        };
    } else if (sortOption === 'monthly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('month').toDate(),
            $lt: moment().endOf('month').toDate()
        };
    } else if (sortOption === 'yearly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('year').toDate(),
            $lt: moment().endOf('year').toDate()
        };
    } else if (sortOption === 'custom' && startDate && endDate) {
        matchCondition.PlacedAt = {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
        };
    }

    let orders, totalOrders, totalSales, totalDiscounts;

    try {
        // Fetch the sales data using the same aggregation as in loadAdminHome
        const salesData = await Order.aggregate([
            { 
                $match: matchCondition  // Only select orders with the "Placed" status
            },
            {
                $lookup: {
                    from: "coupons",  // Assuming the collection is named "coupons"
                    localField: "AppliedCoupon",
                    foreignField: "CouponCode",  // CouponCode field in coupons collection
                    as: "CouponDetails"
                }
            },
            {
                $project: {
                    OrderId: 1,
                    "BillingName": "$Address.FullName",
                    PlacedAt: 1,
                    AppliedCoupon: 1,
                    ActualTotalPrice: 1,  // The price after applying the offer but before coupon
                    TotalPrice: 1,  // Final price after both offer and coupon
                    PriceWithoutDedection: 1,  // Original price before any deductions
                    PaymentMethod: 1,
        
                    // Coupon Deduction: ActualTotalPrice - TotalPrice
                    CouponDeduction: {
                        $cond: {
                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Offer Deduction: PriceWithoutDedection - ActualTotalPrice
                    OfferDeduction: {
                        $cond: {
                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Final Price: TotalPrice after applying both Offer and Coupon Deductions
                    FinalPrice: {
                        $subtract: [
                            "$TotalPrice",
                            {
                                $add: [
                                    {
                                        $cond: {
                                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            else: 0
                                        }
                                    },
                                    {
                                        $cond: {
                                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                                            else: 0
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: "$FinalPrice" },
                    totalDiscounts: { 
                        $sum: {
                            $add: [
                                "$CouponDeduction",
                                "$OfferDeduction"
                            ]
                        }
                    },
                    orders: { $push: "$$ROOT" }  // Push individual orders into the output
                }
            }
        ]);

        // Extract totals from the sales data
        totalOrders = salesData[0]?.totalOrders || 0;
        totalSales = salesData[0]?.totalSales || 0;
        totalDiscounts = salesData[0]?.totalDiscounts || 0;
        orders = salesData[0]?.orders || [];
    } catch (error) {
        return res.status(500).send('Error fetching orders');
    }

    // Create a new Excel workbook and add a worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add header row
    worksheet.columns = [
        { header: 'Order ID', key: 'OrderId', width: 20 },
        { header: 'Billing Name', key: 'BillingName', width: 30 },
        { header: 'Date', key: 'PlacedAt', width: 20 },
        { header: 'Coupon Deduction', key: 'CouponDeduction', width: 20 },
        { header: 'Offer Deduction', key: 'OfferDeduction', width: 20 },
        { header: 'Total', key: 'FinalPrice', width: 20 },
        { header: 'Payment Method', key: 'PaymentMethod', width: 20 },
    ];

    // Add data rows
    orders.forEach(order => {
        worksheet.addRow({
            OrderId: order.OrderId,
            BillingName: order.BillingName,
            PlacedAt: new Date(order.PlacedAt).toLocaleDateString(),
            CouponDeduction: order.CouponDeduction ? order.CouponDeduction.toFixed(2) : '0.00',
            OfferDeduction: order.OfferDeduction.toFixed(2),
            FinalPrice: order.FinalPrice.toFixed(2),
            PaymentMethod: order.PaymentMethod
        });
    });

    // Add summary rows
    worksheet.addRow({}); // Empty row for spacing
    worksheet.addRow({OrderId: 'SUMMARY-'}); // Empty row for spacing
    // Add summary information aligned to the left
    worksheet.addRow({
        OrderId: 'Total Orders:',
        BillingName: totalOrders,
    });
    worksheet.addRow({
        OrderId: 'Total Sales:',
        BillingName: `₹ ${totalSales.toFixed(2)}`,
    });
    worksheet.addRow({
        OrderId: 'Total Discounts:',
        BillingName: `₹ ${totalDiscounts.toFixed(2)}`,
    });

    // Set response headers for Excel file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

    // Write the workbook to the response
    await workbook.xlsx.write(res);
    res.end();
};


const generatePdf = async (req, res) => {
    const { sortOption = "yearly", startDate, endDate } = req.query;

    // Ensure startDate and endDate are valid
    const startDateValue = startDate || ''; // Get start date from query
    const endDateValue = endDate || ''; // Get end date from query
    // Define match condition for date filtering
    let matchCondition = { Status: "Placed" }; // Only select orders with the "Placed" status

    // Setting date range based on the selected sort option
    if (sortOption === 'daily') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('day').toDate(),
            $lt: moment().endOf('day').toDate()
        };
    } else if (sortOption === 'weekly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('week').toDate(),
            $lt: moment().endOf('week').toDate()
        };
    } else if (sortOption === 'monthly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('month').toDate(),
            $lt: moment().endOf('month').toDate()
        };
    } else if (sortOption === 'yearly') {
        matchCondition.PlacedAt = {
            $gte: moment().startOf('year').toDate(),
            $lt: moment().endOf('year').toDate()
        };
    } else if (sortOption === 'custom' && startDate && endDate) {
        matchCondition.PlacedAt = {
            $gte: new Date(startDate),
            $lt: new Date(endDate)
        };
    }

    let orders, totalOrders, totalSales, totalDiscounts;

    try {
        // Fetch the sales data using the same aggregation as before
        const salesData = await Order.aggregate([
            { 
                $match: matchCondition  // Only select orders with the "Placed" status
            },
            {
                $lookup: {
                    from: "coupons",  // Assuming the collection is named "coupons"
                    localField: "AppliedCoupon",
                    foreignField: "CouponCode",  // CouponCode field in coupons collection
                    as: "CouponDetails"
                }
            },
            {
                $project: {
                    OrderId: 1,
                    "BillingName": "$Address.FullName",
                    PlacedAt: 1,
                    AppliedCoupon: 1,
                    ActualTotalPrice: 1,  // The price after applying the offer but before coupon
                    TotalPrice: 1,  // Final price after both offer and coupon
                    PriceWithoutDedection: 1,  // Original price before any deductions
                    PaymentMethod: 1,
        
                    // Coupon Deduction: ActualTotalPrice - TotalPrice
                    CouponDeduction: {
                        $cond: {
                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Offer Deduction: PriceWithoutDedection - ActualTotalPrice
                    OfferDeduction: {
                        $cond: {
                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                            else: 0
                        }
                    },
        
                    // Final Price: TotalPrice after applying both Offer and Coupon Deductions
                    FinalPrice: {
                        $subtract: [
                            "$TotalPrice",
                            {
                                $add: [
                                    {
                                        $cond: {
                                            if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
                                            else: 0
                                        }
                                    },
                                    {
                                        $cond: {
                                            if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
                                            then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
                                            else: 0
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalSales: { $sum: "$FinalPrice" },
                    totalDiscounts: { 
                        $sum: {
                            $add: [
                                "$CouponDeduction",
                                "$OfferDeduction"
                            ]
                        }
                    },
                    orders: { $push: "$$ROOT" }  // Push individual orders into the output
                }
            }
        ]);

        // Extract totals from the sales data
        totalOrders = salesData[0]?.totalOrders || 0;
        totalSales = salesData[0]?.totalSales || 0;
        totalDiscounts = salesData[0]?.totalDiscounts || 0;
        orders = salesData[0]?.orders || [];

        // Log data for debugging
        console.log('Total Orders:', totalOrders);
        console.log('Total Sales:', totalSales);
        console.log('Total Discounts:', totalDiscounts);
        console.log('Number of orders:', orders.length);
        console.log('First order:', orders[0]);

    } catch (error) {
        console.error('Error fetching orders:', error);
        return res.status(500).send('Error fetching orders');
    }

    // Create a PDF document
    const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set the response headers to download the PDF
    res.setHeader('Content-disposition', 'attachment; filename=sales_report.pdf');
    res.setHeader('Content-type', 'application/pdf');

    doc.pipe(res);

    // Add a colored header (you can keep the background blue, but ensure the text is black)
    doc.rect(0, 0, doc.page.width, 100).fill('#4A90E2');
    doc.fontSize(28).font('Helvetica-Bold').fillColor('black').text('Sales Report', 50, 40);

    // Add sort option and date range
    doc.fontSize(12).font('Helvetica').fillColor('black')
    .text(`Sort Option: ${sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}`, 50, 75);
    if (sortOption === 'custom') {
        doc.text(`Date Range: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`, 50, 90);
    }

    // Move to main content area
    doc.moveDown(4);

    // Table Header
    const tableHeaders = ['Order ID', 'Billing Name', 'Date', 'Coupon Deduction', 'Offer Deduction', 'Total', 'Payment Method'];
    const tableTop = 150;
    const tableLeft = 55;
    const rowHeight = 40;
    const columnWidth = (doc.page.width - 100) / tableHeaders.length;

    // Draw table headers (background and border)
    tableHeaders.forEach((header, i) => {
        // Draw header background and border
        doc.rect(tableLeft + (i * columnWidth), tableTop, columnWidth, rowHeight).fillAndStroke('#E0E0E0', '#CCCCCC');
    });

    // Set text properties after drawing the table cells
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black');

    // Add header text
    tableHeaders.forEach((header, i) => {
        doc.text(header, tableLeft + (i * columnWidth) + 5, tableTop + 10, {
            width: columnWidth - 10,
            align: 'center'
        });
    });

    // Draw table rows
    doc.font('Helvetica').fontSize(9).fillColor('black');
    let yPosition = tableTop + rowHeight; // Start below the header

    if (orders.length === 0) {
        doc.fillColor('black').text('No orders found for the selected period.', tableLeft, yPosition + 10, {
            width: doc.page.width - 100,
            align: 'center'
        });
    } else {
        orders.forEach((order, index) => {
            const isEvenRow = index % 2 === 0;
            const rowColor = isEvenRow ? '#F9F9F9' : 'white';

            // Draw row background
            doc.rect(tableLeft, yPosition, doc.page.width - 100, rowHeight).fill(rowColor);

            // Draw cell borders and content
            tableHeaders.forEach((header, i) => {
                doc.rect(tableLeft + (i * columnWidth), yPosition, columnWidth, rowHeight).stroke('#CCCCCC');

                let value = '';
                switch (header) {
                    case 'Order ID':
                        value = order.OrderId || 'N/A';
                        break;
                    case 'Billing Name':
                        value = order.BillingName || 'N/A';
                        break;
                    case 'Date':
                        value = order.PlacedAt ? new Date(order.PlacedAt).toLocaleDateString() : 'N/A';
                        break;
                    case 'Coupon Deduction':
                        value = order.CouponDeduction ? `$${order.CouponDeduction.toFixed(2)}` : '$0.00';
                        break;
                    case 'Offer Deduction':
                        value = order.OfferDeduction ? `$${order.OfferDeduction.toFixed(2)}` : '$0.00';
                        break;
                    case 'Total':
                        value = order.FinalPrice ? `$${order.FinalPrice.toFixed(2)}` : 'N/A';
                        break;
                    case 'Payment Method':
                        value = order.PaymentMethod || 'N/A';
                        break;
                }

                // Ensure text color is black for each cell content
                doc.fillColor('black').text(value, tableLeft + (i * columnWidth) + 5, yPosition + 10, {
                    width: columnWidth - 10,
                    align: 'center'
                });
            });

            yPosition += rowHeight;

            // Add a new page if needed
            if (yPosition > doc.page.height - 100) {
                doc.addPage();
                yPosition = 50;
            }
        });
    }

    // Total Summary
    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('black').text('Summary', 50);
    doc.fontSize(12).font('Helvetica').fillColor('black');
    doc.text(`Total Orders: ${totalOrders}`, 50);
    doc.text(`Total Sales: $${totalSales.toFixed(2)}`, 50);
    doc.text(`Total Discounts: $${totalDiscounts.toFixed(2)}`, 50);

    // Add a footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor('black')
        .text(`Page ${i + 1} of ${pageCount}`, 
                50, 
                doc.page.height - 50, 
                { align: 'center', width: doc.page.width - 100 });
    }

    // Finalize the PDF and end the stream
    doc.end();
};


// Get total sales by month
const getSalesData = async () => {
    const salesData = await Order.aggregate([
        {
            $group: {
                _id: { $month: '$createdAt' },
                totalSales: { $sum: '$TotalPrice' }
            }
        },
        { $sort: { _id: 1 } } // sort by month
    ]);

    return salesData; // array of total sales per month
};

const getYearlySalesData = async () => {
    const yearlySalesData = await Order.aggregate([
        {
            $group: {
                _id: { $year: '$createdAt' },
                totalSales: { $sum: '$TotalPrice' }
            }
        },
        { $sort: { _id: 1 } } // Sort by year
    ]);

    return yearlySalesData; // Array of total sales per year
};

const getWeeklySalesData = async () => {
    const weeklySalesData = await Order.aggregate([
        {
            $group: {
                _id: { $week: '$createdAt' },
                totalSales: { $sum: '$TotalPrice' }
            }
        },
        { $sort: { _id: 1 } } // Sort by week
    ]);

    return weeklySalesData; // Array of total sales per week
};

const getDailySalesData = async () => {
    const dailySalesData = await Order.aggregate([
        {
            $group: {
                _id: { $dayOfYear: '$createdAt' }, // Group by day of the year
                totalSales: { $sum: '$TotalPrice' }
            }
        },
        { $sort: { _id: 1 } } // Sort by day of the year
    ]);

    return dailySalesData; // Array of total sales per day
};

// Get top-selling products
const getTopSellingProducts = async () => {
    const productData = await Order.aggregate([
        { $unwind: '$Products' }, // Unwind the Products array to access individual products
        {
            $group: {
                _id: '$Products.ProductId',
                totalSold: { $sum: '$Products.Quantity' } // Calculate total sold quantity for each product
            }
        },
        {
            $lookup: {
                from: 'products', // Reference the products collection
                localField: '_id', // Match ProductId from Orders
                foreignField: '_id', // Match with _id field in the products collection
                as: 'productDetails' // Store product details in a new field
            }
        },
        { $unwind: '$productDetails' }, // Unwind product details to get the product name
        { $sort: { totalSold: -1 } }, // Sort by most sold products
        { $limit: 5 }, // Limit to top 5 products
        {
            $project: {
                _id: 0, // Hide the product ID
                productName: '$productDetails.Name', // Fetch the product name
                totalSold: 1, // Include totalSold count
                imageUrl: '$productDetails.Images' // Fetch the product image URL
            }
        }
    ]);
    return productData; // Returns top 5 products with their names, total sold quantity, and image URL
};

// Get top-selling categories (genres)
const getTopCategoriesData = async () => {
    const categoriesData = await Order.aggregate([
        { $unwind: '$Products' }, // Unwind products array to access individual products
        {
            $lookup: {
                from: 'products', // Reference the products collection
                localField: 'Products.ProductId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' }, // Unwind the product details
        {
            $lookup: {
                from: 'categories', // Reference the categories collection
                localField: 'productDetails.CategoryId', // Join based on CategoryId in product details
                foreignField: '_id',
                as: 'categoryDetails'
            }
        },
        { $unwind: '$categoryDetails' }, // Unwind the category details to access category name
        {
            $group: {
                _id: '$categoryDetails.CategoryName', // Group by category name
                totalSold: { $sum: '$Products.Quantity' } // Sum the quantities sold in each category
            }
        },
        { $sort: { totalSold: -1 } }, // Sort by the total number of products sold
        { $limit: 5 }  
    ]);

    return categoriesData; // Returns best-selling categories with names and total sold
};

// Get payment method distribution
const getPaymentMethodData = async () => {
    const paymentMethods = await Order.aggregate([
        {
            $group: {
                _id: '$PaymentMethod',
                count: { $sum: 1 }
            }
        }
    ]);

    return paymentMethods;
};

// Get return requests status (Top 3 products with highest returns)
const getReturnRequestData = async () => {
    const returnRequests = await Order.aggregate([
        { $unwind: '$Products' }, // Unwind products array to access individual products
        { $match: { 'ReturnRequest.status': { $ne: null } } }, // Only match orders with return requests
        {
            $lookup: {
                from: 'products', // Join with products collection
                localField: 'Products.ProductId',
                foreignField: '_id',
                as: 'productDetails'
            }
        },
        { $unwind: '$productDetails' }, // Unwind product details to access product name
        {
            $group: {
                _id: '$Products.ProductId',
                productName: { $first: '$productDetails.Name' }, // Fetch the product name
                totalReturns: { $sum: 1 } // Sum the return requests
            }
        },
        { $sort: { totalReturns: -1 } }, // Sort by total returns (highest first)
        { $limit: 3 } // Limit to top 3 returned products
    ]);

    return returnRequests; // Returns top 3 products with the highest returns
};

// Controller to get chart data
const chartData = async (req, res) => {
    const { timeFrame } = req.query; // Get the time frame from the request query
    try {
        let salesData;
        
        // Fetch sales data based on the time frame
        if (timeFrame === 'monthly') {
            salesData = await getSalesData();
        } else if (timeFrame === 'yearly') {
            salesData = await getYearlySalesData();
        } else if (timeFrame === 'weekly') {
            salesData = await getWeeklySalesData();
        } else if (timeFrame === 'daily') { // Handle daily sales data
            salesData = await getDailySalesData();
        } else {
            return res.status(400).json({ error: 'Invalid time frame' });
        }

        const productData = await getTopSellingProducts();
        const categoriesData = await getTopCategoriesData();
        const paymentMethods = await getPaymentMethodData();
        const returnRequests = await getReturnRequestData();

        res.json({
            salesData,
            productData,
            categoriesData,
            paymentMethods,
            returnRequests
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load data' });
    }
};

module.exports={
    loadAdminHome,
    generateExcel,
    generatePdf,
    chartData,
}