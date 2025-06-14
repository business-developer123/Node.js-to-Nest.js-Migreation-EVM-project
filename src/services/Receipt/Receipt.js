const pdf = require('html-pdf');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function generateReceipt(user, tokens, payment, addressInfo, transactionId, orderId) {
    try {
        let transaction = transactionId || uuidv4();
        let order = orderId || uuidv4();
        const customerName = user.username;

        const subtotalPrice = await tokens.reduce((total, token) => {
            const count = token.count ?? 1;
            return total + (count * token.price);
        }, 0);


        const filePath = path.resolve(__dirname, 'images/logo.png');
        const imageBuffer = await fs.readFileSync(filePath);
        const imageBase64 = imageBuffer.toString('base64');
        const imageUrl = `data:image/png;base64,${imageBase64}`;
        const imgElement = `<img src="${imageUrl}" alt="logo">`;

        const smilePath = path.resolve(__dirname, 'images/smile.png');
        const smileBuffer = await fs.readFileSync(smilePath);
        const smileBase64 = smileBuffer.toString('base64');
        const smileUrl = `data:image/png;base64,${smileBase64}`;
        const smileElement = `<img src="${smileUrl}" alt="logo" style="width: 15px; height: 15px">`;

        const boomPath = path.resolve(__dirname, 'images/boom.png');
        const boomBuffer = await fs.readFileSync(boomPath);
        const boomBase64 = boomBuffer.toString('base64');
        const boomUrl = `data:image/png;base64,${boomBase64}`;
        const boomElement = `<img src="${boomUrl}" alt="logo" style="width: 15px; height: 15px">`;

        const phonePath = path.resolve(__dirname, 'images/phone.png');
        const phoneBuffer = await fs.readFileSync(phonePath);
        const phoneBase64 = phoneBuffer.toString('base64');
        const phoneUrl = `data:image/png;base64,${phoneBase64}`;
        const phoneElement = `<img src="${phoneUrl}" alt="logo" style="width: 17px; height: 15px">`;

        const currentDate = new Date();

        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        const dayOfWeek = daysOfWeek[currentDate.getDay()];
        const month = monthsOfYear[currentDate.getMonth()];
        const dayOfMonth = currentDate.getDate();
        const year = currentDate.getFullYear();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        const formattedDate = `${dayOfWeek} ${month} ${dayOfMonth} ${year} ${hours}:${minutes}:${seconds}`;




        const tokenTableRows = tokens.map(token => `
            <tr>
                <td>${token.name}</td>
                <td>${token.count || 1}</td>
                <td>$ ${token.price}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Receipt</title>
                <style>
            body {
                padding: 40px 50px;
                font-size: 13px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid black; /* загальна рамка для таблиці */
            }

            th, td {
                border: 1px solid black; /* рамка для td */
                padding: 8px;
                text-align: left;
                height: 20px;
            }

            th {
                background-color: #f2f2f2;
            }

            td:nth-child(2), td:nth-child(3) {
                width: 30%;
            }
            
            span {
                font-weight: 600 !important;
            }
            
            img {
                width: 65px;
                height: 60px;
            }
            
        </style>
            </head>
            <body>  
                <div>Hi ${customerName} <span style="height: 16px; display: flex; align-items: center"> ${smileElement}</span>,</div>
                <div>Thank you for being apart of our society and supporting the economics ofImagine Council with your recent purchase! <span style="height: 16px; display: flex; align-items: center">${boomElement}</span></div>
                <br/>
                ${imgElement}
                <br/>
                <br/>
                <div style="font-weight: bold">Purchase Details:</div>
                <div>For more information about your purchase, you can visit the Society Mechanics page at <a href="https://imaginecouncil.com/societymechanics." style="color: #c2b47f; text-decoration: none">https://imaginecouncil.com/societymechanics.</a></div>
                <br/>
                <br/>
                <div><span>Items Purchased:</span></div>
                <table>
                    <tr>
                        <th><strong>Item</strong></th>
                        <th><strong>Quantity</strong></th>
                        <th><strong>Price</strong></th>
                    </tr>
                    
                    ${tokenTableRows}
                    
                    <tr>
                        <td></td>
                        <td></td>
                        <td></td>
                    </tr>
                    <tr>
                        <td><strong>Subtotal</strong></td>
                        <td></td>
                        <td>$ ${subtotalPrice}</td>
                    </tr>
                </table>
                <br>
                <div><strong>Payment Details:</strong></div>
                <ul>
                    <li>Payment Method: ${payment === 'stripe' ? "Credit Card" : "PayPal"}</li>
                    <li>Transaction ID: ${transaction}</li>
                </ul>
                <div><strong>Shipping Information:</strong></div>
                <br>
                <div>${addressInfo.firstName ? addressInfo.firstName + ',' : ''} ${addressInfo.lastName ? addressInfo.lastName + ',': ''}</div>
                <div>${addressInfo.country ? addressInfo.country + ',' : ''} ${addressInfo.city ? addressInfo.city + ',': ''} ${addressInfo.street ? addressInfo.street : ''}</div>
                <div>${addressInfo.city ? addressInfo.city + ',' : ''} ${addressInfo.state ? addressInfo.state + ',': ''} ${addressInfo.zip ? addressInfo.zip: ''}</div>
                <div>${user.phoneNumber}</div>
                <br>
                <br>
                <div><strong>Order Summary:</strong></div>
                <ul>
                    <li>Order Number: ${order}</li>
                    <li>Order Date: ${formattedDate}</li>
                </ul>
                <div><strong>Thank you for choosing being apart of the Imagine Council!</strong></div>
                <div style="display: flex; align-items: center">If you have any questions or concerns about your purchase, feel free to reply to this email or contact our customer support at <a href="mailto:support@imaginecouncil.com" style="color: #c2b47f; text-decoration: none">support@imaginecouncil.com</a> <span style="height: 16px; display: flex; align-items: center">${phoneElement}</span></div>
            </body>
            </html>
        `;

        const options = { format: 'Letter' };
        const buffer = await new Promise((resolve, reject) => {
            pdf.create(html, options).toBuffer((err, buffer) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(buffer);
                }
            });
        });

        const attachments = [
            {
                content: buffer.toString('base64'),
                filename: 'Receipt.pdf',
                type: 'application/pdf',
                disposition: 'attachment',
            },
        ];

        return { attachments };
    } catch (error) {
        console.error('Error generating receipt:', error);
        throw error;
    }
}

module.exports = {
    generateReceipt,
};
