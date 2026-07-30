const db = require("../config/db");

// সকল ব্যাচ দেখুন
const getAllBatches = async (req, res) => {
  const {
    seedling_id,
    production_type,
    status,
    from_date,
    to_date,
    page = 1,
    limit = 20,
  } = req.query;
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (seedling_id) {
    params.push(seedling_id);
    conditions.push(`pb.seedling_id = $${params.length}`);
  }
  if (production_type) {
    params.push(production_type);
    conditions.push(`pb.production_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`pb.status = $${params.length}`);
  }
  if (from_date) {
    params.push(from_date);
    conditions.push(`pb.created_at >= $${params.length}`);
  }
  if (to_date) {
    params.push(to_date);
    conditions.push(`pb.created_at <= $${params.length}`);
  }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";

  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM production_batches pb ${where}`,
      params,
    );

    params.push(limit, offset);
    const result = await db.query(
      `SELECT pb.*, s.name_bn AS seedling_bn, s.name_en AS seedling_en, s.seedling_code, s.variety AS seedling_variety,
                    mp.mp_code, mp.variety AS mother_variety
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             LEFT JOIN mother_plants mp ON pb.mother_plant_id = mp.id
             ${where}
             ORDER BY pb.created_at DESC
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

// নতুন ব্যাচ তৈরি করুন (বীজ উৎপাদন)
const createSeedBatch = async (req, res) => {
  const {
    seedling_id,
    seed_source,
    seed_quantity,
    sowing_date,
    germination_date,
    germination_percent,
    produced_quantity,
    success_quantity,
    failed_quantity,
    remarks,
  } = req.body;

  if (!seedling_id || !sowing_date || !produced_quantity) {
    return res.status(400).json({
      success: false,
      message: "চারা, বপন তারিখ ও উৎপাদিত পরিমাণ দিন।",
    });
  }

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    // germination_percent auto-calculate করুন যদি না দেওয়া হয়
    const autoGermPercent =
      germination_percent ||
      (seed_quantity > 0
        ? parseFloat(((produced_quantity / seed_quantity) * 100).toFixed(2))
        : parseFloat(
            (
              (produced_quantity /
                (produced_quantity + (failed_quantity || 0))) *
              100
            ).toFixed(2),
          ) || null);

    // ব্যাচ তৈরি করুন (batch_code trigger দিয়ে auto-generate হবে)
    const batchResult = await client.query(
      `INSERT INTO production_batches
             (seedling_id, production_type, seed_source, seed_quantity, sowing_date,
              germination_date, germination_percent, produced_quantity, success_quantity,
              failed_quantity, available_quantity, remarks, created_by, is_approved)
             VALUES ($1,'seed',$2,$3,$4,$5,$6,$7,$8,$9,$7,$10,$11,false)
             RETURNING *`,
      [
        seedling_id,
        seed_source,
        seed_quantity,
        sowing_date,
        germination_date,
        autoGermPercent,
        produced_quantity,
        success_quantity || produced_quantity,
        failed_quantity || 0,
        remarks,
        req.user.id,
      ],
    );

    const batch = batchResult.rows[0];

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      message: "বীজ উৎপাদন ব্যাচ তৈরি হয়েছে (অনুমোদনের অপেক্ষায়)।",
      data: batch,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// নতুন ব্যাচ তৈরি করুন (অঙ্গজ বংশবিস্তার)
const createAsexualBatch = async (req, res) => {
  const {
    seedling_id,
    production_type,
    mother_plant_id,
    rootstock,
    scion_variety,
    propagation_date,
    produced_quantity,
    success_quantity,
    failed_quantity,
    remarks,
  } = req.body;

  if (
    !seedling_id ||
    !production_type ||
    !propagation_date ||
    !produced_quantity
  ) {
    return res
      .status(400)
      .json({ success: false, message: "সব তথ্য পূরণ করুন।" });
  }

  const successQty = success_quantity || 0;
  const successPercent =
    produced_quantity > 0
      ? ((successQty / produced_quantity) * 100).toFixed(2)
      : 0;

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const batchResult = await client.query(
      `INSERT INTO production_batches
             (seedling_id, production_type, mother_plant_id, rootstock, scion_variety,
              propagation_date, produced_quantity, success_quantity, failed_quantity,
              success_percent, available_quantity, remarks, created_by, is_approved)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$8,$11,$12,false)
             RETURNING *`,
      [
        seedling_id,
        production_type,
        mother_plant_id,
        rootstock,
        scion_variety,
        propagation_date,
        produced_quantity,
        successQty,
        failed_quantity || 0,
        successPercent,
        remarks,
        req.user.id,
      ],
    );

    const batch = batchResult.rows[0];

    await client.query("COMMIT");
    res.status(201).json({
      success: true,
      message: "অঙ্গজ বংশবিস্তার ব্যাচ তৈরি হয়েছে (অনুমোদনের অপেক্ষায়)।",
      data: batch,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ব্যাচের বিস্তারিত
const getBatchById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT pb.*, s.name_bn, s.name_en, s.seedling_code,
                    mp.mp_code, mp.variety AS mother_variety, mp.location AS mother_location
             FROM production_batches pb
             LEFT JOIN seedlings s ON pb.seedling_id = s.id
             LEFT JOIN mother_plants mp ON pb.mother_plant_id = mp.id
             WHERE pb.id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "ব্যাচ পাওয়া যায়নি।" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

const approveBatch = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const batchR = await client.query(
      "SELECT * FROM production_batches WHERE id=$1",
      [req.params.id],
    );
    if (!batchR.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "ব্যাচ পাওয়া যায়নি।" });
    }
    const batch = batchR.rows[0];
    if (batch.is_approved) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, message: "এই ব্যাচ ইতিমধ্যে অনুমোদিত।" });
    }

    // ⚠️ নোটের টেক্সট না দেখে, সরাসরি হিসাব করি এই batch-এর জন্য এখন পর্যন্ত 
    // stock_transactions-এ নীট (net) কত পরিমাণ যোগ হয়ে আছে — শূন্য হলে 
    // (কখনো যোগ হয়নি, বা সম্পূর্ণ reverse হয়ে গেছে) তবেই নতুন করে যোগ করব,
    // নাহলে (আগে থেকেই কোনো পরিমাণ যোগ আছে) আর যোগ করব না (double-counting এড়াতে)
    const netEffectR = await client.query(
      `SELECT COALESCE(SUM(CASE WHEN direction='+' THEN quantity ELSE -quantity END), 0) AS net
       FROM stock_transactions WHERE batch_id=$1 AND txn_type='production'`,
      [batch.id],
    );
    const netEffect = Number(netEffectR.rows[0].net || 0);

    if (netEffect !== 0) {
      const updated = await client.query(
        "UPDATE production_batches SET is_approved=true, approved_by=$1, approved_at=now() WHERE id=$2 RETURNING *",
        [req.user.id, req.params.id],
      );
      await client.query("COMMIT");
      return res.json({
        success: true,
        message: "ব্যাচ অনুমোদিত হিসেবে চিহ্নিত হয়েছে ✅ (স্টক আগেই যোগ হয়ে গিয়েছিল)",
        data: updated.rows[0],
      });
    }

    const qtyToAdd =
      batch.production_type === "seed"
        ? batch.produced_quantity
        : batch.success_quantity;

    await client.query(
      `INSERT INTO stock_transactions
       (seedling_id, batch_id, txn_type, quantity, direction, balance_after, notes, created_by)
       VALUES ($1,$2,'production',$3,'+',0,$4,$5)`,
      [
        batch.seedling_id,
        batch.id,
        qtyToAdd,
        `ব্যাচ ${batch.batch_code} অনুমোদিত`,
        req.user.id,
      ],
    );
    // ✅ current_stock ম্যানুয়ালি বাড়ানোর বদলে, সরাসরি stock_transactions 
    // ledger-এর সম্পূর্ণ যোগফল থেকে পুনর্গণনা করে বসাই — এতে কখনো "drift" 
    // হতে পারে না, current_stock সবসময় ledger-এর সাথে ১০০% মিলবে
    await client.query(
      `UPDATE seedlings SET current_stock = (
         SELECT COALESCE(SUM(CASE WHEN direction='+' THEN quantity ELSE -quantity END), 0)
         FROM stock_transactions WHERE seedling_id=$1
       ) WHERE id=$1`,
      [batch.seedling_id],
    );
    const updated = await client.query(
      "UPDATE production_batches SET is_approved=true, approved_by=$1, approved_at=now() WHERE id=$2 RETURNING *",
      [req.user.id, req.params.id],
    );
    await client.query("COMMIT");
    res.json({
      success: true,
      message: "ব্যাচ অনুমোদন করা হয়েছে ✅",
      data: updated.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  getAllBatches,
  createSeedBatch,
  createAsexualBatch,
  getBatchById,
  approveBatch,
};
