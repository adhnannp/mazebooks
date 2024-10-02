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
    worksheet.addRow({});
    worksheet.addRow({
        OrderId: 'Total Orders:',
        BillingName: totalOrders,
    });
    worksheet.addRow({});
    worksheet.addRow({
        PlacedAt: 'Total Sales:',
        CouponDeduction: totalSales.toFixed(2),
        
    });
    worksheet.addRow({});
    worksheet.addRow({
        OfferDeduction: 'Total Discounts:',
        FinalPrice: totalDiscounts.toFixed(2),
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
    const tableLeft = 50;
    const rowHeight = 30;
    const columnWidth = (doc.page.width - 100) / tableHeaders.length;
    
    // Draw table headers
    doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
    tableHeaders.forEach((header, i) => {
        doc.rect(tableLeft + (i * columnWidth), tableTop, columnWidth, rowHeight).fillAndStroke('#E0E0E0', '#CCCCCC');
        doc.text(header, tableLeft + (i * columnWidth) + 5, tableTop + 10, {
            width: columnWidth - 10,
            align: 'center'
        });
    });
    
    // Draw table rows
    doc.font('Helvetica').fontSize(9);
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
    doc.fontSize(14).font('Helvetica-Bold').fillColor('black').text('Summary', { align: 'center' });
    doc.fontSize(12).font('Helvetica').fillColor('black');
    doc.text(`Total Orders: ${totalOrders}`, { align: 'center' });
    doc.text(`Total Sales: $${totalSales.toFixed(2)}`, { align: 'center' });
    doc.text(`Total Discounts: $${totalDiscounts.toFixed(2)}`, { align: 'center' });
    
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




module.exports={
    loadAdminHome,
    generateExcel,
    generatePdf,
}



// const generateExcel = async (req, res) => {
//     const { sortOption = "yearly", startDate, endDate } = req.query;

    
//     const startDateValue = startDate || ''; 
//     const endDateValue = endDate || ''; 

    
//     let matchCondition = { Status: "Placed" }; /

    
//     if (sortOption === 'daily') {
//         matchCondition.PlacedAt = {
//             $gte: moment().startOf('day').toDate(),
//             $lt: moment().endOf('day').toDate()
//         };
//     } else if (sortOption === 'weekly') {
//         matchCondition.PlacedAt = {
//             $gte: moment().startOf('week').toDate(),
//             $lt: moment().endOf('week').toDate()
//         };
//     } else if (sortOption === 'monthly') {
//         matchCondition.PlacedAt = {
//             $gte: moment().startOf('month').toDate(),
//             $lt: moment().endOf('month').toDate()
//         };
//     } else if (sortOption === 'yearly') {
//         matchCondition.PlacedAt = {
//             $gte: moment().startOf('year').toDate(),
//             $lt: moment().endOf('year').toDate()
//         };
//     } else if (sortOption === 'custom' && startDate && endDate) {
//         matchCondition.PlacedAt = {
//             $gte: new Date(startDate),
//             $lt: new Date(endDate)
//         };
//     }

//     let orders;
//     try {
        
//         orders = await Order.aggregate([
//             { 
//                 $match: matchCondition  
//             },
//             {
//                 $lookup: {
//                     from: "coupons",  
//                     localField: "AppliedCoupon",
//                     foreignField: "CouponCode",  
//                     as: "CouponDetails"
//                 }
//             },
//             {
//                 $project: {
//                     OrderId: 1,
//                     "BillingName": "$Address.FullName",
//                     PlacedAt: 1,
//                     AppliedCoupon: 1,
//                     ActualTotalPrice: 1,  
//                     TotalPrice: 1,  
//                     PriceWithoutDedection: 1,  
//                     PaymentMethod: 1,
        
//                     CouponDeduction: {
//                         $cond: {
//                             if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
//                             then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
//                             else: 0
//                         }
//                     },
        
//                     OfferDeduction: {
//                         $cond: {
//                             if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
//                             then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
//                             else: 0
//                         }
//                     },
        
//                     FinalPrice: {
//                         $subtract: [
//                             "$TotalPrice",
//                             {
//                                 $add: [
//                                     {
//                                         $cond: {
//                                             if: { $gt: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
//                                             then: { $subtract: ["$PriceWithoutDedection", "$ActualTotalPrice"] },
//                                             else: 0
//                                         }
//                                     },
//                                     {
//                                         $cond: {
//                                             if: { $gt: ["$ActualTotalPrice", "$TotalPrice"] },
//                                             then: { $subtract: ["$ActualTotalPrice", "$TotalPrice"] },
//                                             else: 0
//                                         }
//                                     }
//                                 ]
//                             }
//                         ]
//                     }
//                 }
//             }
//         ]);
//     } catch (error) {
//         return res.status(500).send('Error fetching orders');
//     }

//     const workbook = new ExcelJS.Workbook();
//     const worksheet = workbook.addWorksheet('Sales Report');


//     worksheet.columns = [
//         { header: 'Order ID', key: 'OrderId', width: 15 },
//         { header: 'Billing Name', key: 'BillingName', width: 30 },
//         { header: 'Date', key: 'PlacedAt', width: 15 },
//         { header: 'Coupon Deduction', key: 'CouponDeduction', width: 20 },
//         { header: 'Offer Deduction', key: 'OfferDeduction', width: 20 },
//         { header: 'Total', key: 'FinalPrice', width: 20 },
//         { header: 'Payment Method', key: 'PaymentMethod', width: 20 },
//     ];


//     orders.forEach(order => {
//         worksheet.addRow({
//             OrderId: order.OrderId,
//             BillingName: order.BillingName,
//             PlacedAt: new Date(order.PlacedAt).toLocaleDateString(),
//             CouponDeduction: order.CouponDeduction ? order.CouponDeduction.toFixed(2) : '0.00',
//             OfferDeduction: order.OfferDeduction.toFixed(2),
//             FinalPrice: order.FinalPrice.toFixed(2),
//             PaymentMethod: order.PaymentMethod,
//         });
//     });
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', 'inline; filename=sales_report.xlsx'); 

//     await workbook.xlsx.write(res);
//     res.end();
// };