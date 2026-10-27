from fpdf import FPDF
from datetime import date
import os

# -- Colour palette ----------------------------------------------------------
GOLD       = (180, 140, 60)
DARK_GOLD  = (140, 105, 30)
NAVY       = (20,  40,  80)
LIGHT_BLUE = (230, 240, 255)
LIGHT_GOLD = (255, 250, 235)
WHITE      = (255, 255, 255)
DARK_GREY  = (50,  50,  50)
MID_GREY   = (120, 120, 120)
LIGHT_GREY = (245, 245, 245)
GREEN_BG   = (220, 245, 220)
GREEN_FG   = (30,  130, 30)
RED_BG     = (255, 230, 230)
RED_FG     = (180, 30,  30)
BLUE_BG    = (225, 235, 255)
BLUE_FG    = (30,  60,  160)
AMBER_BG   = (255, 248, 220)
AMBER_FG   = (160, 100, 0)


class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=18)

    # -- Header ---------------------------------------------------------------
    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*GOLD)
        self.rect(0, 0, 210, 8, 'F')
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*WHITE)
        self.set_xy(10, 1.5)
        self.cell(0, 5, 'Partner Onboarding - Business Logic Documentation', ln=False)
        self.set_xy(-50, 1.5)
        self.cell(40, 5, f'Page {self.page_no()}', align='R')
        self.set_text_color(*DARK_GREY)
        self.ln(10)

    # -- Footer ---------------------------------------------------------------
    def footer(self):
        if self.page_no() == 1:
            return
        self.set_y(-12)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_font('Helvetica', '', 7)
        self.set_text_color(*MID_GREY)
        self.cell(0, 6, f'GEC Services  *  Confidential  *  {date.today().strftime("%B %d, %Y")}', align='C')

    # -- Helpers ---------------------------------------------------------------
    def section_title(self, number, title):
        self.ln(4)
        y = self.get_y()
        h = 10
        self.set_fill_color(*GOLD)
        self.rect(10, y, 3, h, 'F')
        self.set_fill_color(*LIGHT_GOLD)
        self.rect(13, y, 187, h, 'F')
        self.set_xy(16, y + 1.5)
        self.set_font('Helvetica', 'B', 12)
        self.set_text_color(*NAVY)
        self.cell(184, 7, f'{number}:  {title}', ln=True)
        self.set_y(y + h)
        self.set_text_color(*DARK_GREY)
        self.ln(3)

    def sub_title(self, text):
        self.ln(2)
        self.set_font('Helvetica', 'B', 10)
        self.set_text_color(*NAVY)
        self.set_x(10)
        self.cell(0, 6, text, ln=True)
        self.set_text_color(*DARK_GREY)
        self.set_font('Helvetica', '', 9.5)

    def body(self, text):
        self.set_font('Helvetica', '', 9.5)
        self.set_text_color(*DARK_GREY)
        self.set_x(10)
        self.multi_cell(190, 5.5, text)
        self.ln(1)

    def req_table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [190 // len(headers)] * len(headers)
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 9)
        self.set_x(10)
        for i, h in enumerate(headers):
            self.cell(col_widths[i], 7, h, border=0, fill=True, align='C')
        self.ln()
        self.set_font('Helvetica', '', 9)
        for ri, row in enumerate(rows):
            self.set_fill_color(*LIGHT_GREY if ri % 2 == 0 else WHITE)
            self.set_text_color(*DARK_GREY)
            self.set_x(10)
            for i, cell in enumerate(row):
                self.cell(col_widths[i], 6.5, cell, border=0, fill=True, align='C' if i > 0 else 'L')
            self.ln()
        self.ln(3)

    def rule_box(self, title, lines, bg=LIGHT_BLUE, title_color=BLUE_FG):
        self.set_x(10)
        self.set_fill_color(*title_color)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 9)
        self.cell(190, 6, '  ' + title, fill=True, ln=True)
        self.set_fill_color(*bg)
        self.set_text_color(*DARK_GREY)
        self.set_font('Helvetica', '', 9)
        for line in lines:
            self.set_x(10)
            self.cell(190, 5.5, '    ' + line, fill=True, ln=True)
        self.ln(3)

    def step_row(self, label, desc, label_bg=NAVY, body_bg=LIGHT_BLUE):
        self.set_x(10)
        self.set_fill_color(*label_bg)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 8)
        self.cell(20, 6, label, fill=True, align='C')
        self.set_fill_color(*body_bg)
        self.set_text_color(*DARK_GREY)
        self.set_font('Helvetica', '', 9)
        self.cell(170, 6, '  ' + desc, fill=True)
        self.ln(7)

    def divider(self):
        self.ln(2)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def step_block(self, step_num, heading, body_text, bg=LIGHT_BLUE, fg=BLUE_FG):
        self.set_x(10)
        self.set_fill_color(*fg)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 9)
        self.cell(8, 6, str(step_num), fill=True, align='C')
        self.set_fill_color(*bg)
        self.set_text_color(*fg)
        self.cell(182, 6, '  ' + heading, fill=True)
        self.ln(7)
        self.set_x(18)
        self.set_font('Helvetica', '', 9)
        self.set_text_color(*DARK_GREY)
        self.multi_cell(178, 5, body_text)
        self.ln(2)


# ============================================================
# BUILD PDF
# ============================================================
pdf = PDF()
pdf.set_margins(10, 18, 10)


# ============================================================
# COVER PAGE
# ============================================================
pdf.add_page()

pdf.set_fill_color(*NAVY)
pdf.rect(0, 0, 210, 297, 'F')
pdf.set_fill_color(*GOLD)
pdf.rect(0, 0, 210, 70, 'F')
pdf.set_fill_color(*DARK_GOLD)
pdf.rect(0, 65, 210, 8, 'F')

pdf.set_xy(0, 18)
pdf.set_font('Helvetica', 'B', 28)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'Partner Onboarding', align='C', ln=True)
pdf.set_font('Helvetica', 'B', 20)
pdf.cell(0, 10, 'Business Logic Documentation', align='C', ln=True)

# White card
pdf.set_fill_color(*WHITE)
pdf.set_draw_color(*GOLD)
pdf.set_line_width(0.8)
pdf.rect(18, 86, 174, 158, 'FD')

pdf.set_xy(18, 93)
pdf.set_font('Helvetica', 'B', 12)
pdf.set_text_color(*NAVY)
pdf.cell(174, 8, 'Document Overview', align='C', ln=True)
pdf.set_draw_color(*GOLD)
pdf.set_line_width(0.5)
pdf.line(28, pdf.get_y() + 1, 182, pdf.get_y() + 1)
pdf.ln(5)

toc = [
    ('Feature 1',   'Partner Delivery Info Step - New 3rd Wizard Step'),
    ('Feature 2',   'Employee Status Management: ADD / UPDATE / DELETE'),
    ('Feature 2.2', 'Dashboard Sync - Right Panel Sync Button'),
    ('Feature 2.3', 'Member Card Type Control (EN=7 / DE=5)'),
    ('Feature 3',   'Brew partner_onboarding_data - action_type Column'),
    ('Fix 1',       'action_type Read from CSV (not hardcoded)'),
    ('Fix 2',       'Deduplication in Pending Batch Query'),
    ('Feature 4',   'Pre-fill Delivery Contact Info in Onboarding Wizard'),
    ('Feature 5',   'Synchronized Column in Employee List DataGrid'),
    ('Feature 6',   'Phone Number Validation via libphonenumber-js'),
    ('Feature 6.1', 'Enhance Phone + Email Validation in XLSX Import'),
    ('Feature 6.2', 'Phone Validation in Delivery Info Wizard Step'),
    ('Feature 7',   'Fortify Member Card Sync - Guard, Upsert, Card Number'),
    ('Feature 7.2', 'German-Speaking Sync Separation (DE / EN split)'),
]
for label, desc in toc:
    pdf.set_x(26)
    pdf.set_fill_color(*GOLD)
    pdf.set_text_color(*WHITE)
    pdf.set_font('Helvetica', 'B', 7.5)
    pdf.cell(24, 5.5, label, fill=True, align='C')
    pdf.set_fill_color(*LIGHT_GOLD)
    pdf.set_text_color(*DARK_GREY)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.cell(140, 5.5, '  ' + desc, fill=True)
    pdf.ln(6.2)

pdf.set_xy(18, 253)
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(*MID_GREY)
pdf.cell(174, 5, f'Prepared: {date.today().strftime("%B %d, %Y")}   *   GEC Services   *   Confidential', align='C')


# ============================================================
# PAGE 2 - Feature 1 + Feature 2
# ============================================================
pdf.add_page()

pdf.section_title('Feature 1', 'Partner Delivery Info Step in Onboarding Wizard')

pdf.body(
    'A new step was inserted as the 3rd step of the Partner Onboarding Wizard. '
    'Partners cannot advance to the final submission step until this step is fully completed. '
    'The step collects the delivery address and contact details required for physical card delivery.'
)

pdf.sub_title('Required Fields')
pdf.req_table(
    ['#', 'Field Name', 'Mandatory'],
    [
        ['1', 'Delivery Address', 'Yes'],
        ['2', 'Contact Person',   'Yes'],
        ['3', 'Phone Number',     'Yes'],
    ],
    col_widths=[20, 120, 50]
)

pdf.rule_box('Validation Rules', [
    'All three fields are required. The wizard blocks progression if any field is empty.',
    'Phone number is validated via libphonenumber-js (see Feature 6.2).',
    'If a delivery record already exists for this partner, fields are pre-filled from the database',
    '  with the most recent non-duplicate entry, but remain editable by the partner.',
], bg=LIGHT_BLUE, title_color=BLUE_FG)

pdf.divider()

pdf.section_title('Feature 2', 'Employee Status Management (ADD / UPDATE / DELETE)')

pdf.body(
    'HR staff can now manage employee records during the CSV upload step of the Partner Onboarding '
    'process. Each row in the uploaded CSV must include an action_type column specifying what the '
    'system should do with that record when it is synced to the member_card table.'
)

pdf.sub_title('Supported Actions')
pdf.req_table(
    ['action_type', 'Operation'],
    [
        ['add',    'Creates a new record in member_card for this employee'],
        ['update', 'Updates an existing member_card record (safe personal fields only)'],
        ['delete', 'Soft-deletes the member_card record (sets active = 0, preserves data)'],
    ],
    col_widths=[35, 155]
)

pdf.sub_title('Frontend Scope')
pdf.body(
    'The ADD / UPDATE / DELETE action controls were moved from the Partner Employee List '
    'Submission section to the Corporate Members section. The Employee List Submission '
    'section no longer shows those controls - the action is driven entirely by the CSV column.'
)

pdf.sub_title('Feature 2 - Part 2: Dashboard Sync Enhancement (Right Panel Sync Button)')
pdf.body(
    'The Partner Onboarding Dashboard has a left panel and a right panel. '
    'The Sync button was previously available only on the left panel. '
    'This enhancement adds a Sync button to the right panel as well, targeting '
    'partners that do not yet exist in the services database.'
)
pdf.req_table(
    ['Panel', 'Sync Button Behaviour'],
    [
        ['Left Panel',  'Syncs partners that already exist in the services database (unchanged)'],
        ['Right Panel', 'Syncs partners that do NOT yet exist in the services database'],
    ],
    col_widths=[35, 155]
)

pdf.sub_title('Feature 2 - Part 3: Member Card Type Assignment')
pdf.body(
    'For every INSERT and UPDATE operation in member_card, the system automatically assigns '
    'the correct card type based on the member\'s language field:'
)
pdf.req_table(
    ['Condition', 'member_card.type value'],
    [
        ['Default (all members)',     '7'],
        ['Member language is German (de)', '5'],
    ],
    col_widths=[120, 70]
)


# ============================================================
# PAGE 3 - Feature 3 + Fix Tickets
# ============================================================
pdf.add_page()

pdf.section_title('Feature 3', 'Brew partner_onboarding_data - action_type Column')

pdf.body(
    'The partner_onboarding_data table was extended with an action_type column. '
    'Every employee record uploaded via CSV now stores the intended operation '
    '(add, update, or delete) alongside the personal data. When the Sync button '
    'is triggered, the system reads this flag and dispatches the correct operation.'
)

pdf.sub_title('Extended INSERT Statement')
pdf.body(
    'The INSERT statement was updated to include the action_type field:'
)
pdf.rule_box('SQL - INSERT OR IGNORE INTO partner_onboarding_data', [
    'Fields: title, firstname, lastname, gender, mobile_number, email,',
    '        partner, birthday, language, action_type',
    'Values: ?, ?, ?, ?, ?, ?, ?, ?, ?, ?',
    'Note: action_type comes from the CSV row - not hardcoded.',
], bg=LIGHT_GREY, title_color=NAVY)

pdf.sub_title('Sync Dispatch Logic')
pdf.body(
    'During a sync run, the system reads action_type for each pending record and '
    'invokes the corresponding operation on member_card:'
)
pdf.req_table(
    ['action_type in DB', 'Operation performed during Sync'],
    [
        ['add',    'INSERT a new member_card record (or UPDATE if phone already exists)'],
        ['update', 'UPDATE the existing member_card record (safe fields only)'],
        ['delete', 'Soft-delete the member_card record (sets active = 0)'],
    ],
    col_widths=[40, 150]
)

pdf.divider()

pdf.section_title('Fix 1', 'action_type Read from CSV (Not Hardcoded)')

pdf.body(
    'In the original insertContact function, the action_type value was hardcoded rather than '
    'read from the uploaded CSV. This fix passes the action_type column value from each CSV row '
    'as a parameter - the same way all other fields are handled.'
)
pdf.rule_box('What changed', [
    'Before: action_type was hardcoded to a fixed value inside the function.',
    'After:  action_type = r.action_type  (read from the normalised CSV row object)',
    'Impact: Every record now carries the correct operation intent from the moment it is stored.',
], bg=AMBER_BG, title_color=AMBER_FG)

pdf.divider()

pdf.section_title('Fix 2', 'Deduplication in Pending Batch Query')

pdf.body(
    'The query that loads pending partner_onboarding_data records for a sync run was updated '
    'to deduplicate by mobile_number. If the same phone number appears in multiple unsynced rows, '
    'only the most recently created row is kept and processed. This prevents stale or duplicate '
    'entries from being synced multiple times.'
)
pdf.rule_box('Deduplication Logic', [
    'Step 1: Select all unsynced records for the partner within the last month.',
    'Step 2: Apply ROW_NUMBER() OVER (PARTITION BY mobile_number ORDER BY metadata_createdAt DESC).',
    'Step 3: Keep only rn = 1 (the most recent record per phone number).',
    'Result: Each phone number appears at most once in any given sync batch.',
], bg=LIGHT_BLUE, title_color=BLUE_FG)


# ============================================================
# PAGE 4 - Feature 4 + Feature 5
# ============================================================
pdf.add_page()

pdf.section_title('Feature 4', 'Pre-fill Delivery Contact Info in Onboarding Wizard')

pdf.body(
    'When a partner reaches Step 3 (Delivery Info) of the Onboarding Wizard, the system '
    'automatically looks up whether a delivery address already exists in the database for '
    'that partner. If found, the relevant fields are pre-filled so the partner does not '
    'need to re-enter information they have already provided.'
)

pdf.sub_title('Lookup Flow')
for label, desc in [
    ('Step 1', 'Query partner_delivery_info using the partner name with case-insensitive matching.'),
    ('Step 2', 'If multiple rows exist, deduplicate: keep the most recent record per phone_number.'),
    ('Step 3', 'If a record is found, pre-fill the Delivery Address and Phone Number form fields.'),
    ('Step 4', 'Pre-filled fields remain fully editable - the partner can update them before saving.'),
    ('Step 5', 'If no record exists, all fields remain blank as normal.'),
]:
    pdf.step_row(label, desc)

pdf.ln(1)

pdf.sub_title('SQL Query Used')
pdf.rule_box('Deduplication query on partner_delivery_info', [
    'WITH unsynced_table AS (',
    '  SELECT * FROM partner_delivery_info WHERE LOWER(partner) = LOWER(?)',
    '),',
    'deduped AS (',
    '  SELECT *, ROW_NUMBER() OVER (PARTITION BY phone_number',
    '    ORDER BY metadata_createdAt DESC) AS rn FROM unsynced_table',
    ')',
    'SELECT * FROM deduped WHERE rn = 1;',
], bg=LIGHT_GREY, title_color=NAVY)

pdf.rule_box('Acceptance Criteria', [
    '[x] Query uses case-insensitive partner name matching.',
    '[x] Deduplication applied - most recent record per phone_number wins.',
    '[x] If a record exists, form fields are pre-filled (but remain editable).',
    '[x] If no record exists, fields remain blank.',
], bg=GREEN_BG, title_color=GREEN_FG)

pdf.divider()

pdf.section_title('Feature 5', 'Synchronized Column in Employee List DataGrid')

pdf.body(
    'A Synchronized column was added to the Partner Employee List Submission DataGrid so '
    'staff can see at a glance which records have already been synced to the member card '
    'system and which are still pending.'
)

pdf.req_table(
    ['State', 'What the user sees'],
    [
        ['Default (page load)', 'Only non-synchronized (pending) records are shown'],
        ['Toggle ON',           'Both synchronized and pending records are visible'],
    ],
    col_widths=[60, 130]
)

pdf.rule_box('Acceptance Criteria', [
    '[x] "Synchronized" column added to the DataGrid with a clear visual indicator per row.',
    '[x] On page load, only pending (non-synchronized) records are loaded by default.',
    '[x] A toggle control allows the user to show synchronized records as well.',
    '[x] Switching the toggle does not require a full page reload.',
], bg=GREEN_BG, title_color=GREEN_FG)


# ============================================================
# PAGE 5 - Feature 6, 6.1, 6.2
# ============================================================
pdf.add_page()

pdf.section_title('Feature 6 / 6.1', 'Phone + Email Validation During XLSX Import')

pdf.body(
    'When HR uploads an XLSX employee file, every phone number and email address is validated '
    'before the data is accepted. Rows that fail validation are collected in a Faulty Records '
    'report and excluded from the upload - the remaining valid rows are processed normally.'
)

pdf.sub_title('Phone Number Normalisation and Validation Steps')
for step in [
    '1.  Trim leading and trailing whitespace from the raw value.',
    '2.  Remove all characters except digits and the leading "+" sign using a regex.',
    '3.  If the cleaned number does not start with "+", prepend it automatically.',
    '4.  Pass the normalised number to parsePhoneNumberFromString (libphonenumber-js).',
    '5.  If the library reports the number as invalid, the row is flagged as faulty.',
    '6.  The normalised phone number is written back into the CSV (not the raw original).',
]:
    pdf.set_x(14)
    pdf.set_font('Helvetica', '', 9.5)
    pdf.set_text_color(*DARK_GREY)
    pdf.cell(0, 5.5, step, ln=True)
pdf.ln(2)

pdf.sub_title('Email Validation')
pdf.body(
    'Each email address is checked against a standard regex pattern (must contain exactly one "@" '
    'and a domain with at least one "."). Rows with an empty or malformed email are flagged as faulty.'
)

pdf.sub_title('Duplicate Phone Detection')
pdf.body(
    'If the same phone number appears more than once in the same file, all duplicate rows '
    '(after the first occurrence) are flagged as faulty with a "Duplicate Mobile Number" '
    'reason, referencing the first row where the number appeared.'
)

pdf.rule_box('What happens to faulty rows?', [
    '* Excluded from the CSV that is uploaded to the server.',
    '* A Faulty Records panel is shown listing each failed row, its field values,',
    '  and the specific reason for rejection.',
    '* Valid rows continue through the normal upload flow unaffected.',
], bg=RED_BG, title_color=RED_FG)

pdf.divider()

pdf.section_title('Feature 6.2', 'Phone Validation in Delivery Info Step (Onboarding Wizard)')

pdf.body(
    'The same phone normalisation and validation logic (trim, strip, prepend "+", validate via '
    'libphonenumber-js) is applied to the Phone Number field in Step 3 (Delivery Info) of the '
    'Partner Onboarding Wizard. The partner cannot advance to the next step until a valid '
    'international phone number has been entered.'
)

pdf.req_table(
    ['Input Example', 'Result'],
    [
        ['+49 151 12345678',   'Valid - partner may proceed'],
        ['0151 12345678',      'Normalised to +0151... - likely invalid without a country code prefix'],
        ['not a phone number', 'All non-digit chars stripped -> invalid -> error shown'],
        ['(empty)',            'Field is empty - error shown, cannot proceed'],
    ],
    col_widths=[70, 120]
)


# ============================================================
# PAGE 6 - Feature 7: Fortify Member Card Sync
# ============================================================
pdf.add_page()

pdf.section_title('Feature 7', 'Fortify the Member Card Sync')

pdf.body(
    'The /api/member-card-sync endpoint processes all pending employee records for a given '
    'partner and language group, then applies them to the member_card table inside a single '
    'database transaction. Feature 7 hardened this process with a smarter add/upsert flow, '
    'an active-member guard, automatic card number generation, and a stricter update policy.'
)

pdf.sub_title('Sync Transaction - Step-by-Step Overview')

pdf.step_block(0, 'Load Pending Batch',
    'All unsynced partner_onboarding_data records for this partner and language, created within '
    'the last month, are loaded. Deduplication is applied: if the same phone number appears '
    'more than once, only the most recently created row is retained. Records are then split '
    'into three batches: addBatch, updateBatch, deleteBatch.',
    bg=LIGHT_GOLD, fg=AMBER_FG)

pdf.step_block(1, 'Process UPDATE Records',
    'For each record in updateBatch: first check whether the phone number already belongs to '
    'a member_card row owned by a different partner. If a conflict is found, this record is '
    'skipped and processing continues with the next. If there is no conflict, only safe personal '
    'fields are updated: firstname, lastname, title, birthday, email, and active status. '
    'Card number, card type, and partner name are never changed by an update operation.',
    bg=LIGHT_BLUE, fg=BLUE_FG)

pdf.step_block(2, 'Process DELETE Records',
    'For each record in deleteBatch: the matching member_card row is soft-deleted by setting '
    'active = 0 and writing a timestamped remark. The row is retained in the database '
    'and can be reactivated later if needed.',
    bg=RED_BG, fg=RED_FG)

pdf.step_block(3, 'Process ADD Records (with Guard + Upsert)',
    'Each record in addBatch passes through a two-stage decision before any write occurs. '
    'See the decision flow on the next section below.',
    bg=GREEN_BG, fg=GREEN_FG)

pdf.step_block(4, 'Mark Records as Synchronized',
    'All records in the processed batch are marked synchronized = 1 so they are excluded '
    'from all future sync runs for this partner.',
    bg=LIGHT_GREY, fg=DARK_GREY)

pdf.divider()

pdf.sub_title('Step 3 - ADD Decision Flow')

y_box = pdf.get_y()
pdf.set_fill_color(*LIGHT_GOLD)
pdf.set_draw_color(*GOLD)
pdf.set_line_width(0.4)
pdf.rect(12, y_box, 186, 76, 'FD')
pdf.set_xy(16, y_box + 3)
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(*NAVY)
pdf.cell(0, 5.5, 'For each record in addBatch:', ln=True)

flow = [
    ('Check 1', '3-Month Active Guard',
     'Is this phone active in member_card AND was a matching record synced in the last 3 months?',
     'YES -> SKIP this record entirely (do not insert or update)', GREEN_FG,
     'NO  -> proceed to Check 2', BLUE_FG),
    ('Check 2', 'Phone Already in member_card?',
     'Does a member_card row already exist for this phone number (regardless of partner)?',
     'YES -> UPDATE the existing row (upsert: personal fields + type)', BLUE_FG,
     'NO  -> INSERT a brand-new member_card row with a generated card number', GREEN_FG),
]
for step_label, step_title, question, yes_action, yes_color, no_action, no_color in flow:
    pdf.set_x(16)
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(*NAVY)
    pdf.cell(0, 5, step_label + ' - ' + step_title + ':', ln=True)
    pdf.set_x(20)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(*MID_GREY)
    pdf.cell(0, 4.5, question, ln=True)
    pdf.set_x(24)
    pdf.set_font('Helvetica', 'B', 8.5)
    pdf.set_text_color(*yes_color)
    pdf.cell(0, 5, yes_action, ln=True)
    pdf.set_x(24)
    pdf.set_text_color(*no_color)
    pdf.cell(0, 5, no_action, ln=True)
    pdf.ln(1.5)

pdf.set_text_color(*DARK_GREY)
pdf.set_y(y_box + 78)
pdf.ln(2)

pdf.divider()

pdf.sub_title('Card Number Generation (INSERT only - new records)')
pdf.body(
    'When a genuinely new member is inserted (phone not found in member_card), the system '
    'automatically generates a unique card number and expiry date. No manual entry is needed.'
)
pdf.req_table(
    ['Member Language', 'Card Number Prefix', 'Generation Rule', 'Fallback Base'],
    [
        ['English (en)', '7', 'MAX(card_number starting with 7) + 1', '7000001'],
        ['German  (de)', '5', 'MAX(card_number starting with 5) + 1', '5000001'],
    ],
    col_widths=[40, 38, 76, 36]
)
pdf.body(
    'Card expiry date is set to exactly one year from the date of sync (datetime("now", "+1 year")).'
)


# ============================================================
# PAGE 7 - Feature 7.2: German-Speaking Sync Separation
# ============================================================
pdf.add_page()

pdf.section_title('Feature 7.2', 'German-Speaking Sync Separation (DE / EN Split)')

pdf.body(
    'The /api/member-card-sync endpoint was extended to enforce strict language-based separation. '
    'Each sync call must now specify a language parameter ("en" or "de"). The endpoint only '
    'processes records whose language field matches the requested language. This ensures that '
    'the two dashboard sections never accidentally process each other\'s records.'
)

pdf.sub_title('Language Routing per Dashboard Section')
pdf.req_table(
    ['Dashboard Section', 'Sync Button Label', 'language param sent', 'Records processed'],
    [
        ['PartnerOnboardingSection',  'Sync',     '"en"', 'English-speaking employees only'],
        ['DeliveryTrackingSection',   'Sync (DE)', '"de"', 'German-speaking employees only'],
    ],
    col_widths=[55, 38, 35, 62]
)

pdf.rule_box('Enforcement Points', [
    'UI: Each section passes its designated language in the POST body when the Sync button is clicked.',
    'Backend: The language field is now required. A missing or invalid value returns HTTP 400.',
    'Query: Step 0 SQL adds AND LOWER(language) = LOWER(?) to filter the batch by language.',
    'Result: Each sync run is scoped to exactly one language group for one partner.',
], bg=LIGHT_BLUE, title_color=BLUE_FG)

pdf.divider()

pdf.section_title('Feature 7.2 - Context', 'Delivery & Tracking Section (New Dashboard Panel)')

pdf.body(
    'A new Delivery & Tracking section was added to the dashboard. It is split into a left panel '
    'and a right panel, and it is specifically designed to manage German-speaking employee records '
    'that have an associated delivery location.'
)

pdf.sub_title('Left Panel (1/4 Width) - Partner List')
pdf.body(
    'Displays the list of all partners. The list reuses the same data source as the rightTableRows '
    'implementation in MemberCardDataGrid.jsx (GEC grouped partners + partner_onboarding_data). '
    'A partner is selectable only if a delivery location record exists for that partner. '
    'Partners without a delivery record are shown but are disabled (greyed out).'
)

pdf.sub_title('Right Panel (3/4 Width) - Delivery Info + Employees Grid')
for label, desc in [
    ('Item 1', 'When a partner is selected, the delivery location details are displayed at the top of the panel.'),
    ('Item 2', 'Below the delivery info, a CustomDataGrid shows partner_onboarding_data records for the selected partner.'),
    ('Item 3', 'The grid is filtered to show only German-speaking (language = "de") employees.'),
    ('Item 4', 'A "Pending Only / Showing All" toggle lets staff filter by sync status.'),
    ('Item 5', 'A "Sync (DE)" button triggers /api/member-card-sync for the selected partner with language="de".'),
]:
    pdf.step_row(label, desc, label_bg=NAVY, body_bg=LIGHT_GOLD)

pdf.ln(2)

pdf.rule_box('Key Design Decisions', [
    'The Delivery & Tracking section reuses existing components and data-fetch patterns.',
    'Only partners with a delivery record are actionable - this prevents sync errors for',
    '  partners who have not yet set up their delivery location.',
    'The language filter is applied server-side (on the /api/partner-delivery-employees endpoint)',
    '  so only DE records ever reach the grid, reducing the risk of processing the wrong group.',
], bg=AMBER_BG, title_color=AMBER_FG)

pdf.divider()

pdf.sub_title('Summary - All Sync Protections')
pdf.req_table(
    ['Risk', 'Protection Mechanism'],
    [
        ['Re-activating an already-active, recently-synced member',
         '3-month active guard skips the ADD record'],
        ['Duplicate card numbers across the system',
         'MAX+1 generation per language prefix guarantees uniqueness'],
        ['Updating a phone number owned by another partner',
         'Phone conflict check skips the UPDATE record'],
        ['Overwriting card number or partner on update',
         'Only safe personal fields (name, title, DOB, email) are touched'],
        ['Stale duplicate entries processed multiple times',
         'Deduplication in Step 0 keeps only the latest record per phone'],
        ['DE and EN records mixed in the same sync run',
         'language parameter enforced in both UI and backend query'],
    ],
    col_widths=[95, 95]
)


# ============================================================
# SAVE
# ============================================================
out = '/Users/germanworldclub/Downloads/registration-app20250717-update/documentation/Partner_Onboarding_Business_Logic.pdf'
os.makedirs(os.path.dirname(out), exist_ok=True)
pdf.output(out)
print(f'PDF saved -> {out}')
