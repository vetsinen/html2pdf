const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const mustache = require("mustache");
const fileType = require("file-type");

async function renderHtmlTemplate(){
  const template = await fs.promises.readFile(
      "./assets/postalLayout.sv-1.template.html",
      {
        encoding: "utf8",
      }
  );

  const partials = {
    content: await fs.promises.readFile(
        "./assets/postalPersonalizedBookingConfirmedBody.sv-1-fixed.template.html",
        { encoding: "utf8" }
    ),
  };

  const view = {
    appUrl: "https://aleris.strikersoft.dev",
    marketingUrl: "https://aleris.se",
    tenantName: "Aleris",
    careunitName: "Aleris Vaccination & Resemedicin",
    careunitAddress: "Olof Palmes Gata 9, tr 3, Stockholm",
    careunitPhoneNumber: "+380441111111",
    patientPersonalNumber: "191212121212",
    patientFullName: "Tolvan Tolvansson",
    nowDate: "2021-10-20",
    patientAddress: "line1, line2",
    patientZipCode: "113 51",
    patientPostOffice: "Stockholm",
    visitDate: "2021-10-21",
    visitStartTime: "12:00",
    visitEndTime: "12:30",
  };

  let html = mustache.render(template, view, partials);

  for (const [cid, fileName] of html.matchAll(/"cid:([^"]*)"/g)) {
    const filePath = path.join("./assets", fileName);
    const base64 = await fs.promises.readFile(filePath, {
      encoding: "base64",
    });

    const { mime } = await fileType.fromFile(filePath);
    html = html.replace(cid, `"data:${mime};base64, ${base64}"`);
  }
  return html
}

(async () => {
  const html = await renderHtmlTemplate()
  await fs.promises.writeFile(`assets/rendered.html`, html);

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
  });

  const page = await browser.newPage();
  await page.setContent(html);
  const buffer = await page.pdf({
    preferCSSPageSize: true,
  });
  await page.close();
  await browser.close();

  const fileName = new Date().toISOString();
  await fs.promises.writeFile(`out/${fileName}.pdf`, buffer);
})();
