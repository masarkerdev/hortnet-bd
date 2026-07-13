const db = require("../config/db");

// সকল বিক্রয় দেখুন
const getAllSales = async (req, res) => {
  const {
    from_date,
    to_date,
    payment_status,
    search,
    page = 1,
    limit = 20,
  } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (from_date) {
    params.push(from_date);
    conditions.push(`s.sale_date >= $${params.length}`);
  }
  if (to_date) {
    params.push(to_date);
    conditions.push(`s.sale_date <= $${params.length}`);
  }
  if (payment_status) {
    params.push(payment_status);
    conditions.push(`s.payment_status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(s.invoice_no ILIKE $${params.length} OR s.customer_name ILIKE $${params.length})`,
    );
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM sales s ${where}`,
      params,
    );
    params.push(limit, offset);
    const result = await db.query(
      `SELECT s.*, u.name AS created_by_name
             FROM sales s
             LEFT JOIN users u ON s.created_by = u.id
             ${where}
             ORDER BY s.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// চালানের বিস্তারিত (আইটেম সহ)
const getSaleById = async (req, res) => {
  try {
    const sale = await db.query(
      `SELECT s.*, u.name AS created_by_name FROM sales s
             LEFT JOIN users u ON s.created_by = u.id WHERE s.id = $1`,
      [req.params.id],
    );
    if (sale.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "চালান পাওয়া যায়নি।" });
    }

    const items = await db.query(
      `SELECT si.*, s.name_bn, s.name_en, s.variety, s.seedling_code, pb.batch_code
             FROM sales_items si
             LEFT JOIN seedlings s ON si.seedling_id = s.id
             LEFT JOIN production_batches pb ON si.batch_id = pb.id
             WHERE si.sale_id = $1`,
      [req.params.id],
    );

    res.json({ success: true, data: { ...sale.rows[0], items: items.rows } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// নতুন বিক্রয় তৈরি করুন
const createSale = async (req, res) => {
  const {
    customer_id,
    customer_name,
    customer_phone,
    customer_address,
    sale_date,
    items,
    discount,
    payment_method,
    payment_status,
    notes,
  } = req.body;

  if (!items || items.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "কমপক্ষে একটি আইটেম দিন।" });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    // মোট হিসাব
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.quantity * item.unit_price;
    }
    const totalAmount = subtotal - (discount || 0);

    // বিক্রয় তৈরি করুন (invoice_no trigger দিয়ে auto-generate)
    const saleResult = await client.query(
      `INSERT INTO sales
             (customer_id, customer_name, customer_phone, customer_address, sale_date,
              subtotal, discount, total_amount, payment_method, payment_status, notes, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             RETURNING *`,
      [
        customer_id,
        customer_name,
        customer_phone,
        customer_address,
        sale_date || new Date().toISOString().split("T")[0],
        subtotal,
        discount || 0,
        totalAmount,
        payment_method || "cash",
        payment_status || "paid",
        notes,
        req.user.id,
      ],
    );

    const sale = saleResult.rows[0];

    // ✅ নতুন — গ্রাহক তালিকায় স্বয়ংক্রিয়ভাবে যোগ করুন
    if (customer_name) {
      try {
        if (customer_phone) {
          const existingCustomer = await client.query(
            "SELECT id FROM customers WHERE phone = $1",
            [customer_phone],
          );
          if (existingCustomer.rows.length === 0) {
            await client.query(
              "INSERT INTO customers (name, phone, address) VALUES ($1,$2,$3)",
              [customer_name, customer_phone, customer_address || null],
            );
          }
        } else {
          const existingCustomer = await client.query(
            "SELECT id FROM customers WHERE name = $1",
            [customer_name],
          );
          if (existingCustomer.rows.length === 0) {
            await client.query(
              "INSERT INTO customers (name, address) VALUES ($1,$2)",
              [customer_name, customer_address || null],
            );
          }
        }
      } catch (custErr) {
        console.log("Customer auto-save skipped:", custErr.message);
      }
    }

    // আইটেম যোগ করুন ও স্টক কমান
    for (const item of items) {
      const stockCheck = await client.query(
        "SELECT current_stock, name_bn FROM seedlings WHERE id = $1",
        [item.seedling_id],
      );
      if (stockCheck.rows.length === 0) {
        throw new Error(`চারা ID ${item.seedling_id} পাওয়া যায়নি।`);
      }
      const currentStock = parseInt(stockCheck.rows[0].current_stock);
      if (currentStock < item.quantity) {
        throw new Error(
          `${stockCheck.rows[0].name_bn} এর স্টক পর্যাপ্ত নেই। আছে: ${currentStock}, চাইলেন: ${item.quantity}`,
        );
      }
      await client.query(
        `INSERT INTO sales_items (sale_id, seedling_id, batch_id, quantity, unit_price, total_price)
                 VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          sale.id,
          item.seedling_id,
          item.batch_id || null,
          item.quantity,
          item.unit_price,
          item.quantity * item.unit_price,
        ],
      );
      const newStock = currentStock - item.quantity;
      await client.query(
        "UPDATE seedlings SET current_stock = $1 WHERE id = $2",
        [newStock, item.seedling_id],
      );
      await client.query(
        `INSERT INTO stock_transactions
                 (seedling_id, batch_id, txn_type, quantity, direction, balance_after, reference_id, reference_type, notes, created_by)
                 VALUES ($1,$2,'sale',$3,'-',$4,$5,'sale',$6,$7)`,
        [
          item.seedling_id,
          item.batch_id || null,
          item.quantity,
          newStock,
          sale.id,
          `চালান ${sale.invoice_no} থেকে বিক্রয়`,
          req.user.id,
        ],
      );
    }

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      message: `বিক্রয় সম্পন্ন! চালান নম্বর: ${sale.invoice_no}`,
      data: sale,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// আজকের বিক্রয় সারসংক্ষেপ
const getTodaySummary = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
               COUNT(*) AS total_invoices,
               COALESCE(SUM(total_amount), 0) AS total_revenue,
               COALESCE(SUM(total_amount) FILTER (WHERE payment_status='paid'), 0) AS paid_amount,
               COALESCE(SUM(total_amount) FILTER (WHERE payment_status='pending'), 0) AS pending_amount
             FROM sales
             WHERE sale_date = CURRENT_DATE`,
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// মাসিক বিক্রয় রিপোর্ট
const getMonthlySales = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  try {
    const result = await db.query(
      `SELECT
               EXTRACT(MONTH FROM sale_date) AS month,
               TO_CHAR(sale_date, 'Month') AS month_name,
               COUNT(*) AS invoices,
               COALESCE(SUM(total_amount), 0) AS revenue
             FROM sales
             WHERE EXTRACT(YEAR FROM sale_date) = $1
             GROUP BY month, month_name
             ORDER BY month`,
      [year],
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllSales,
  getSaleById,
  createSale,
  getTodaySummary,
  getMonthlySales,
};
