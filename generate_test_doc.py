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
PURPLE_BG  = (240, 230, 255)
PURPLE_FG  = (90,  30,  160)


class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=18)

    def header(self):
        if self.page_no() == 1:
            return
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 8, 'F')
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*WHITE)
        self.set_xy(10, 1.5)
        self.cell(0, 5, 'Partner Onboarding - Test Permutations Document', ln=False)
        self.set_xy(-50, 1.5)
        self.cell(40, 5, f'Page {self.page_no()}', align='R')
        self.set_text_color(*DARK_GREY)
        self.ln(10)

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

    def section_title(self, area, title, color=NAVY, bg=LIGHT_GOLD):
        self.ln(4)
        y = self.get_y()
        h = 10
        self.set_fill_color(*GOLD)
        self.rect(10, y, 3, h, 'F')
        self.set_fill_color(*bg)
        self.rect(13, y, 187, h, 'F')
        self.set_xy(16, y + 1.5)
        self.set_font('Helvetica', 'B', 11)
        self.set_text_color(*color)
        self.cell(184, 7, f'{area}  |  {title}', ln=True)
        self.set_y(y + h)
        self.set_text_color(*DARK_GREY)
        self.ln(2)

    def sub_title(self, text):
        self.ln(1)
        self.set_font('Helvetica', 'B', 9)
        self.set_text_color(*NAVY)
        self.set_x(10)
        self.cell(0, 6, text, ln=True)
        self.set_text_color(*DARK_GREY)

    def divider(self):
        self.ln(2)
        self.set_draw_color(*GOLD)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(3)

    def test_table(self, rows, counter_start):
        # Column widths: #(10) | Scenario(112) | Expected(68)
        CW = [10, 112, 68]
        # Header
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font('Helvetica', 'B', 8.5)
        self.set_x(10)
        for label, w in zip(['#', 'Scenario / Input', 'Expected Outcome'], CW):
            self.cell(w, 7, label, fill=True, align='C' if label == '#' else 'L', border=0)
        self.ln()

        n = counter_start
        for ri, (scenario, expected, row_type) in enumerate(rows):
            # row background
            if row_type == 'pass':
                bg = GREEN_BG
            elif row_type == 'fail':
                bg = RED_BG
            elif row_type == 'skip':
                bg = AMBER_BG
            elif row_type == 'info':
                bg = LIGHT_BLUE
            else:
                bg = LIGHT_GREY if ri % 2 == 0 else WHITE

            # measure height needed
            self.set_font('Helvetica', '', 8.5)
            scenario_lines = self._count_lines(scenario, CW[1] - 4)
            expected_lines = self._count_lines(expected, CW[2] - 4)
            row_h = max(scenario_lines, expected_lines) * 5 + 3

            # check page break manually
            if self.get_y() + row_h > self.h - 20:
                self.add_page()
                # re-draw header
                self.set_fill_color(*NAVY)
                self.set_text_color(*WHITE)
                self.set_font('Helvetica', 'B', 8.5)
                self.set_x(10)
                for label, w in zip(['#', 'Scenario / Input', 'Expected Outcome'], CW):
                    self.cell(w, 7, label, fill=True, align='C' if label == '#' else 'L', border=0)
                self.ln()

            y_row = self.get_y()

            # number cell
            self.set_fill_color(*NAVY)
            self.set_text_color(*WHITE)
            self.set_font('Helvetica', 'B', 8)
            self.set_xy(10, y_row)
            self.cell(CW[0], row_h, str(n), fill=True, align='C', border=0)

            # scenario cell
            self.set_fill_color(*bg)
            self.set_text_color(*DARK_GREY)
            self.set_font('Helvetica', '', 8.5)
            self.set_xy(10 + CW[0], y_row)
            self.multi_cell(CW[1], 5, '  ' + scenario, fill=True, border=0)

            # expected cell — draw fill rect then text
            cell_y_after = self.get_y()
            self.set_fill_color(*bg)
            self.rect(10 + CW[0] + CW[1], y_row, CW[2], row_h, 'F')
            self.set_xy(10 + CW[0] + CW[1] + 2, y_row + 1)
            self.set_font('Helvetica', 'B' if row_type in ('pass', 'fail', 'skip') else '', 8.5)
            if row_type == 'pass':
                self.set_text_color(*GREEN_FG)
            elif row_type == 'fail':
                self.set_text_color(*RED_FG)
            elif row_type == 'skip':
                self.set_text_color(*AMBER_FG)
            elif row_type == 'info':
                self.set_text_color(*BLUE_FG)
            else:
                self.set_text_color(*DARK_GREY)
            self.multi_cell(CW[2] - 4, 5, expected, border=0)

            self.set_text_color(*DARK_GREY)
            self.set_y(y_row + row_h)
            n += 1

        self.ln(3)
        return n  # return updated counter

    def _count_lines(self, text, width):
        self.set_font('Helvetica', '', 8.5)
        lines = 1
        for para in text.split('\n'):
            w = self.get_string_width(para + '  ')
            lines += max(0, int(w / width))
        return lines

    def legend(self):
        self.set_x(10)
        self.set_font('Helvetica', 'B', 8)
        self.set_text_color(*NAVY)
        self.cell(0, 5, 'Row colour key:', ln=True)
        legend_items = [
            (GREEN_BG,  GREEN_FG,  'PASS  - expected success / accepted'),
            (RED_BG,    RED_FG,    'FAIL  - expected rejection / error / skip'),
            (AMBER_BG,  AMBER_FG,  'SKIP  - record skipped by guard, processing continues'),
            (LIGHT_BLUE, BLUE_FG, 'INFO  - neutral / state check'),
            (LIGHT_GREY, DARK_GREY, 'neutral - alternating background'),
        ]
        for bg, fg, label in legend_items:
            self.set_x(12)
            self.set_fill_color(*bg)
            self.rect(12, self.get_y(), 6, 4.5, 'F')
            self.set_xy(20, self.get_y())
            self.set_font('Helvetica', '', 8)
            self.set_text_color(*fg)
            self.cell(0, 4.5, label, ln=True)
        self.set_text_color(*DARK_GREY)
        self.ln(2)


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
pdf.set_font('Helvetica', 'B', 26)
pdf.set_text_color(*WHITE)
pdf.cell(0, 12, 'Partner Onboarding', align='C', ln=True)
pdf.set_font('Helvetica', 'B', 18)
pdf.cell(0, 10, 'Test Permutations Document', align='C', ln=True)

pdf.set_fill_color(*WHITE)
pdf.set_draw_color(*GOLD)
pdf.set_line_width(0.8)
pdf.rect(18, 86, 174, 178, 'FD')

pdf.set_xy(18, 93)
pdf.set_font('Helvetica', 'B', 11)
pdf.set_text_color(*NAVY)
pdf.cell(174, 8, 'Test Areas', align='C', ln=True)
pdf.set_draw_color(*GOLD)
pdf.set_line_width(0.5)
pdf.line(28, pdf.get_y() + 1, 182, pdf.get_y() + 1)
pdf.ln(5)

areas = [
    ('Area 1',  '5 cases',  'API Layer - Parameter Validation'),
    ('Area 2',  '11 cases', 'Step 0 - Batch Loading and Deduplication'),
    ('Area 3',  '9 cases',  'Step 1 - UPDATE Records'),
    ('Area 4',  '4 cases',  'Step 2 - DELETE Records'),
    ('Area 5',  '6 cases',  'Step 3 ADD - Check 1: 3-Month Active Guard'),
    ('Area 6',  '4 cases',  'Step 3 ADD - Check 2: Upsert vs Insert'),
    ('Area 7',  '8 cases',  'Step 3 ADD - Card Number and Expiry Generation'),
    ('Area 8',  '5 cases',  'Step 4 - Mark Records as Synchronized'),
    ('Area 9',  '14 cases', 'XLSX Upload - Phone and Email Validation'),
    ('Area 10', '13 cases', 'Onboarding Wizard - Delivery Info Step'),
    ('Area 11', '14 cases', 'Dashboard UI - Sync, DataGrid, and Refetch'),
]
total = sum(int(c.split()[0]) for _, c, _ in areas)

for label, count, desc in areas:
    pdf.set_x(26)
    pdf.set_fill_color(*GOLD)
    pdf.set_text_color(*WHITE)
    pdf.set_font('Helvetica', 'B', 7.5)
    pdf.cell(20, 5.5, label, fill=True, align='C')
    pdf.set_fill_color(*NAVY)
    pdf.cell(16, 5.5, count, fill=True, align='C')
    pdf.set_fill_color(*LIGHT_GOLD)
    pdf.set_text_color(*DARK_GREY)
    pdf.set_font('Helvetica', '', 8.5)
    pdf.cell(128, 5.5, '  ' + desc, fill=True)
    pdf.ln(6.5)

pdf.ln(3)
pdf.set_x(26)
pdf.set_fill_color(*DARK_GOLD)
pdf.set_text_color(*WHITE)
pdf.set_font('Helvetica', 'B', 9)
pdf.cell(36, 7, f'Total: {total} cases', fill=True, align='C')
pdf.ln(10)

pdf.set_xy(18, 271)
pdf.set_font('Helvetica', '', 8)
pdf.set_text_color(*MID_GREY)
pdf.cell(174, 5, f'Prepared: {date.today().strftime("%B %d, %Y")}   *   GEC Services   *   Confidential', align='C')

# ============================================================
# PAGE 2 - Legend + Area 1: API Layer
# ============================================================
pdf.add_page()
pdf.set_font('Helvetica', 'B', 9)
pdf.set_text_color(*NAVY)
pdf.set_x(10)
pdf.cell(0, 6, 'How to read this document', ln=True)
pdf.set_font('Helvetica', '', 9)
pdf.set_text_color(*DARK_GREY)
pdf.set_x(10)
pdf.multi_cell(190, 5,
    'Each test case lists the scenario or input condition and the expected outcome. '
    'Row colours indicate whether the expected outcome is a success, a rejection, '
    'a guarded skip, or a neutral state check.')
pdf.ln(1)
pdf.legend()
pdf.divider()

pdf.section_title('Area 1', 'API Layer - Parameter Validation', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('POST /api/member-card-sync - request body validation')

c = 1
c = pdf.test_table([
    ('POST with no partner field in request body',
     'HTTP 400 - "partner is required"', 'fail'),
    ('POST with no language field in request body',
     'HTTP 400 - "language must be en or de"', 'fail'),
    ('POST with language = "fr" (unsupported value)',
     'HTTP 400 - "language must be en or de"', 'fail'),
    ('POST with valid partner + language = "en"',
     'HTTP 200 - sync runs against EN batch', 'pass'),
    ('POST with valid partner + language = "de"',
     'HTTP 200 - sync runs against DE batch', 'pass'),
], c)

# ============================================================
# Area 2: Step 0
# ============================================================
pdf.section_title('Area 2', 'Step 0 - Batch Loading and Deduplication', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Records selected from partner_onboarding_data before dispatch to Steps 1-4')

c = pdf.test_table([
    ('No unsynced records exist for this partner + language',
     'Returns {updated:0, inserted:0, deactivated:0} - transaction exits early', 'info'),
    ('Records exist but all synchronized = 1',
     'Excluded from batch - empty batch, same early exit', 'info'),
    ('Records exist but all created more than 1 month ago',
     'Excluded by date filter - empty batch', 'info'),
    ('Records within last month with synchronized = 0',
     'Included in batch for processing', 'pass'),
    ('Records within last month with synchronized = 1',
     'Excluded - WHERE synchronized != 1 filters them out', 'info'),
    ('Same phone number appears twice, both unsynced, different created timestamps',
     'Only the most recent by metadata_createdAt is kept (ROW_NUMBER dedup)', 'info'),
    ('Same phone number appears 3 times, all unsynced',
     'Only the single most recent record survives deduplication', 'info'),
    ('Two different phone numbers, both unsynced',
     'Both included independently - one record per phone', 'pass'),
    ('Partner has EN + DE pending records; sync called with language="en"',
     'Only EN records enter the batch; DE records remain unsynced', 'info'),
    ('Partner has EN + DE pending records; sync called with language="de"',
     'Only DE records enter the batch; EN records remain unsynced', 'info'),
    ('Partner has only EN records; sync called with language="de"',
     'Empty batch - returns {0, 0, 0}', 'info'),
], c)

# ============================================================
# Page 3 - Area 3: Step 1 UPDATE
# ============================================================
pdf.add_page()
pdf.section_title('Area 3', 'Step 1 - UPDATE Records', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Each record in updateBatch is evaluated independently')

c = pdf.test_table([
    ('UPDATE: phone number belongs to a member_card row of the SAME partner',
     'Update proceeds - personal fields written to member_card', 'pass'),
    ('UPDATE: phone number belongs to a member_card row of a DIFFERENT partner',
     'Record SKIPPED - conflict detected, next record continues', 'skip'),
    ('UPDATE: phone number not found in member_card at all',
     '0 rows changed - no match, processing continues without error', 'info'),
    ('UPDATE with language="en": type field on member_card',
     'member_card.type set to 7', 'pass'),
    ('UPDATE with language="de": type field on member_card',
     'member_card.type set to 5', 'pass'),
    ('UPDATE record: firstname, lastname, title, birthday, email fields',
     'All updated on the matching member_card row', 'pass'),
    ('UPDATE record: card_number field',
     'NOT changed - card_number is never modified by an update operation', 'info'),
    ('UPDATE record: partner field on member_card',
     'NOT changed - partner is never modified by an update operation', 'info'),
    ('Batch contains 3 UPDATE records; second has a phone conflict',
     'Records 1 and 3 are updated; record 2 is skipped; all continue', 'info'),
], c)

pdf.divider()
pdf.section_title('Area 4', 'Step 2 - DELETE Records', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Each record in deleteBatch soft-deletes the matching member_card row')

c = pdf.test_table([
    ('DELETE: partner + phone match found in member_card',
     'active set to 0; timestamped remark written; row retained in DB', 'pass'),
    ('DELETE: phone not found in member_card',
     '0 changes - no match; processing continues without error', 'info'),
    ('DELETE: phone exists in member_card but belongs to a DIFFERENT partner',
     'WHERE clause (partner + phone) does not match - nothing deactivated', 'fail'),
    ('Batch contains multiple DELETE records',
     'Each evaluated independently - no all-or-nothing behaviour', 'info'),
], c)

# ============================================================
# Page 4 - Area 5: ADD Check 1 (3-month guard)
# ============================================================
pdf.add_page()
pdf.section_title('Area 5', 'Step 3 ADD - Check 1: 3-Month Active Guard', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Guard fires only when ALL three conditions are true simultaneously')
pdf.set_font('Helvetica', 'I', 8.5)
pdf.set_text_color(*MID_GREY)
pdf.set_x(10)
pdf.multi_cell(190, 5,
    'Condition A: phone exists in member_card with active = 1\n'
    'Condition B: a partner_onboarding_data record with the same phone and synchronized = 1 exists\n'
    'Condition C: that pod record was created less than 3 months ago')
pdf.set_text_color(*DARK_GREY)
pdf.ln(1)

c = pdf.test_table([
    ('Phone NOT in member_card at all (new member)',
     'Condition A false - guard NOT triggered - proceed to Check 2', 'pass'),
    ('Phone in member_card with active = 0',
     'Condition A false - guard NOT triggered - proceed to Check 2', 'pass'),
    ('Phone in member_card active=1, but NO pod record synced within 3 months',
     'Condition B or C false - guard NOT triggered - proceed to Check 2', 'pass'),
    ('Phone in member_card active=1, pod record exists, synchronized=0 (not yet synced)',
     'Condition B false - guard NOT triggered - proceed to Check 2', 'pass'),
    ('Phone in member_card active=1, pod record exists, synchronized=1, created > 3 months ago',
     'Condition C false - guard NOT triggered - proceed to Check 2', 'pass'),
    ('Phone in member_card active=1, pod record exists, synchronized=1, created < 3 months ago',
     'ALL conditions true - record SKIPPED entirely, next record processed', 'skip'),
], c)

pdf.divider()
pdf.section_title('Area 6', 'Step 3 ADD - Check 2: Upsert vs Insert Decision', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Only reached after passing the 3-month guard')

c = pdf.test_table([
    ('Phone NOT found in member_card (genuinely new member)',
     'INSERT new member_card row with generated card number and expiry date', 'pass'),
    ('Phone ALREADY exists in member_card (any active state, passed the guard)',
     'UPDATE existing row - personal fields and type updated; card number unchanged', 'pass'),
    ('Upsert path: card_number on the existing member_card row',
     'Unchanged - card_number is never regenerated on an upsert', 'info'),
    ('Upsert path: card_expiry_date on the existing member_card row',
     'Unchanged - expiry date is not reset on an upsert', 'info'),
], c)

# ============================================================
# Page 5 - Area 7: Card Number Generation
# ============================================================
pdf.add_page()
pdf.section_title('Area 7', 'Step 3 ADD - Card Number and Expiry Date Generation', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Applies only to genuine INSERTs (new phone not found in member_card)')

c = pdf.test_table([
    ('EN member inserted; no existing cards starting with "7" in member_card',
     'card_number = 7000001 (base fallback + 1)', 'pass'),
    ('EN member inserted; highest existing "7xxxxxxx" card = 7000010',
     'card_number = 7000011 (MAX + 1)', 'pass'),
    ('DE member inserted; no existing cards starting with "5" in member_card',
     'card_number = 5000001 (base fallback + 1)', 'pass'),
    ('DE member inserted; highest existing "5xxxxxxx" card = 5000003',
     'card_number = 5000004 (MAX + 1)', 'pass'),
    ('Two EN members inserted in the same sync batch',
     'Second gets MAX+1 after the first insert; no duplicate card numbers', 'pass'),
    ('New EN member: card_number prefix',
     'Starts with "7" - language-driven prefix enforced', 'pass'),
    ('New DE member: card_number prefix',
     'Starts with "5" - language-driven prefix enforced', 'pass'),
    ('Card expiry date on a new INSERT',
     'Set to datetime("now", "+1 year") - exactly 1 year from sync date', 'pass'),
], c)

pdf.divider()
pdf.section_title('Area 8', 'Step 4 - Mark Records as Synchronized', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Runs after all Steps 1-3; marks the batch window as done')

c = pdf.test_table([
    ('Records that were actively processed in Steps 1-3',
     'Marked synchronized = 1', 'pass'),
    ('Older duplicate pod records for the same phone excluded by Step 0 dedup',
     'Also marked synchronized = 1 by the blanket Step 4 UPDATE (no individual exclusion)', 'info'),
    ('Records belonging to a DIFFERENT partner',
     'Not touched - WHERE LOWER(partner) = LOWER(?) scopes the update', 'info'),
    ('Records already synchronized = 1 before sync ran',
     'Not affected - WHERE synchronized != 1 excludes them', 'info'),
    ('Records older than 1 month',
     'Not marked - outside the Step 4 WHERE date window', 'info'),
], c)

# ============================================================
# Page 6 - Area 9: XLSX Upload Validation
# ============================================================
pdf.add_page()
pdf.section_title('Area 9', 'XLSX Upload - Phone and Email Validation (Feature 6 / 6.1)', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Phone normalisation pipeline: trim -> strip chars -> prepend "+" -> validate via libphonenumber-js')

c = pdf.test_table([
    ('Phone with leading and trailing whitespace',
     'Trimmed before any other processing', 'pass'),
    ('Phone with dashes, spaces, or parentheses (e.g. "+49 (0) 151-123")',
     'Non-digit non-"+" chars stripped; cleaned value passed to validator', 'pass'),
    ('Cleaned phone does not start with "+"',
     '"+" prepended automatically before libphonenumber-js call', 'pass'),
    ('Valid E.164 phone after normalisation (e.g. "+491511234567")',
     'Row accepted - phone written back to CSV as normalised value', 'pass'),
    ('Invalid phone after normalisation (e.g. only digits, no valid country prefix)',
     'Row added to FaultyRecord list with reason', 'fail'),
    ('Empty phone cell',
     'Row added to FaultyRecord list', 'fail'),
    ('Same phone number appears twice in the same uploaded file',
     'Second occurrence flagged as FaultyRecord "Duplicate Mobile Number"', 'fail'),
    ('Same phone number appears 3 times',
     '2nd and 3rd occurrence flagged; first occurrence kept and processed', 'fail'),
    ('Valid email address (user@domain.com)',
     'Email accepted', 'pass'),
    ('Email missing "@" symbol',
     'Row added to FaultyRecord list', 'fail'),
    ('Email missing domain part',
     'Row added to FaultyRecord list', 'fail'),
    ('Empty email cell',
     'Row added to FaultyRecord list', 'fail'),
    ('File with a mix of valid rows and faulty rows',
     'Valid rows uploaded normally; faulty rows shown in Faulty Records panel', 'info'),
    ('File where every row is faulty',
     'Nothing uploaded to server; full Faulty Records panel displayed', 'fail'),
], c)

# ============================================================
# Page 7 - Area 10: Wizard Delivery Info Step
# ============================================================
pdf.add_page()
pdf.section_title('Area 10', 'Onboarding Wizard - Delivery Info Step (Features 1, 4, 6.2)', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('Step 3 of the Partner Onboarding Wizard - field validation and pre-fill behaviour')

c = pdf.test_table([
    ('All three fields filled: Delivery Address, Contact Person, Phone Number',
     'Wizard allows progression to the next step', 'pass'),
    ('Delivery Address left empty',
     'Wizard blocks progression; error indicator shown on field', 'fail'),
    ('Contact Person left empty',
     'Wizard blocks progression; error indicator shown on field', 'fail'),
    ('Phone Number left empty',
     'Wizard blocks progression; error indicator shown on field', 'fail'),
    ('All three fields empty on first load',
     'All fields show required indicators; next step blocked', 'fail'),
    ('Phone field: valid international number (e.g. "+49 151 12345678")',
     'Validation passes; wizard allows progression', 'pass'),
    ('Phone field: number entered without "+" (e.g. "0151 12345678")',
     '"+" prepended then validated - likely fails without full country code; error shown', 'fail'),
    ('Phone field: text-only input (e.g. "call me")',
     'All non-digit chars stripped -> empty -> invalid; error shown, blocked', 'fail'),
    ('Phone field: whitespace only',
     'Trimmed to empty -> invalid; error shown, blocked', 'fail'),
    ('Partner arrives at Step 3 and NO delivery record exists in database',
     'All fields start blank', 'info'),
    ('Partner arrives at Step 3 and ONE delivery record exists',
     'Delivery Address and Phone Number fields pre-filled from that record', 'pass'),
    ('Partner has multiple delivery records with different phone numbers',
     'Most recent record per phone_number selected (deduplication); fields pre-filled', 'pass'),
    ('Partner has multiple records with the SAME phone number',
     'Most recent by metadata_createdAt wins; deduplicated correctly', 'pass'),
    ('Partner name in DB uses different casing from current session (e.g. "Acme" vs "ACME")',
     'Case-insensitive LOWER() match finds the record', 'pass'),
    ('Pre-filled fields',
     'Remain fully editable - partner can overwrite before submitting', 'info'),
    ('Partner submits Step 3 with modified pre-filled values',
     'New values saved; pre-filled values not enforced', 'pass'),
], c)

# ============================================================
# Page 8 - Area 11: Dashboard UI
# ============================================================
pdf.add_page()
pdf.section_title('Area 11', 'Dashboard UI - Sync Buttons, DataGrid, and Refetch (Features 2.2, 5, 7.2, Enhancement)', color=NAVY, bg=LIGHT_GOLD)
pdf.sub_title('UI-level behaviour across MemberCardDataGrid and DeliveryTrackingSection')

c = pdf.test_table([
    ('PartnerOnboardingSection DataGrid on page load',
     'Only synchronized=0 (pending) records loaded by default', 'info'),
    ('"Showing All" toggle activated',
     'Both pending and synced records shown; no full page reload', 'pass'),
    ('Toggle switched back to "Pending Only"',
     'Only pending records shown again; no full page reload', 'pass'),
    ('Synchronized column on a synced row',
     'Displays "Synced" badge (success colour)', 'info'),
    ('Synchronized column on a pending row',
     'Displays "Pending" badge (warning colour)', 'info'),
    ('Left panel Sync button triggered (MemberCardDataGrid)',
     'Syncs partners that already exist in services DB with language="en"', 'pass'),
    ('Right panel Sync button triggered (MemberCardDataGrid)',
     'Syncs partners NOT yet in services DB with language="en"', 'pass'),
    ('DeliveryTrackingSection: partner without a delivery location record',
     'Partner shown in left panel list but disabled (unclickable)', 'info'),
    ('DeliveryTrackingSection: partner with a delivery location record',
     'Clickable; selecting loads delivery info card + DE employees grid', 'pass'),
    ('Sync (DE) button clicked while a sync is already in progress',
     'Button disabled; spinner shown; duplicate request not sent', 'info'),
    ('Sync (DE) completes successfully',
     'Snackbar shows updated/inserted/deactivated counts', 'pass'),
    ('Sync (DE) succeeds: employee grid in right panel',
     'Automatically refetches and reflects current synchronized state', 'pass'),
    ('Sync (DE) succeeds: pending count badges in left panel',
     'Refetched - counts decrease to reflect newly synchronized records', 'pass'),
    ('Sync (EN) succeeds in PartnerOnboardingSection: partner_onboarding_data grid',
     'Automatically refetches via refreshKey increment - pending rows disappear', 'pass'),
    ('Sync (EN) succeeds: partner stats and pending counts in MemberCardDataGrid',
     'fetchPartnerStats and fetchPendingCounts both called; tables update', 'pass'),
    ('Sync fails (API or network error)',
     'Error snackbar shown; no data refetch triggered', 'fail'),
], c)

# ============================================================
# SAVE
# ============================================================
out = '/Users/germanworldclub/Downloads/registration-app20250717-update/documentation/Partner_Onboarding_Test_Permutations.pdf'
os.makedirs(os.path.dirname(out), exist_ok=True)
pdf.output(out)
print(f'PDF saved -> {out}')
