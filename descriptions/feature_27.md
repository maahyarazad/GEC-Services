# Feature 26 – Improve File List

## Part 1

### Description

In **`FileList.jsx`**:

- The save feature should open a modal and suggest a default file name based on the project name.
- Allow users to create folders so they can organize files.
- Enable drag-and-drop functionality for files.
- Provide a tree view to display files and folders in a hierarchical structure.

This should function as a full-featured file explorer.

The same behavior should also apply to the file-saving flow.




## Part 2

### Description

In **`FileList.jsx`**: Create a menu bar and put all of the icons in the menu bar 

```jsx
 <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <IconButton title="Save" onClick={openSaveDialog}>
                        <RiSave3Fill color="#1976D2" size={iconSize} />
                    </IconButton>
                    <IconButton title="New Folder" onClick={openFolderDialog}>
                        <VscNewFolder color="orange" size={iconSize - 2} />
                    </IconButton>
                    <Button
                        color='#717171'
                        startIcon={<VscNewFile size={iconSize} />}
                        onClick={() => handleSelectFile({ path: '', data: initialFormData })}
                        sx={{ textTransform: 'none', padding: 0 }}
                    >
                        <span style={{ fontSize: 10, wordBreak: 'keep-all' }}>
                            New File
                        </span>
                    </Button>
                </div>

                <InvoiceDownload iconSize={iconSize} formData={formData} loadingFlag={loadingFlag} filename={filename}/>
            </div>
```

## Part 3

### Description

In **`PDFGenerator.jsx`**: make everything 10 percent smaller and also in the description section put (title, qty, disc, vat, Vat P and amount ) side by side

```jsx
    <Box sx={{
                    width: { xs: '100%', md: '35%' },
                    height: { lg: 'calc(100vh - 125px)' },
                    overflowY: { lg: 'scroll' },
                    flexShrink: 0,
                }} className='rounded border p-1'>
                    <form style={{ display: 'block' }}>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Project & Company Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ flex: 1 }}>
                                        {renderFields('project', 'project')}
                                    </Box>
                                    <Box sx={{ flex: 1 }}>
                                        {renderFields('company', 'company')}
                                    </Box>
                                </Box>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Project Reference</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('reference', 'reference')}
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Descriptions</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {/* Toggles */}
                                <Box sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #ccc' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <Switch
                                            size="small"
                                            onChange={(e) => setFormData((prev) => ({ ...prev, items_price: e.target.checked }))}
                                            checked={!!formData?.items_price}
                                            color="primary"
                                        />
                                        <Typography variant="caption">Enable (Dummy String) Price Column</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                        <Switch
                                            size="small"
                                            color="primary"
                                            checked={!!formData.currency?.currency_enable}
                                            onChange={(e) => setFormData((prev) => ({
                                                ...prev,
                                                currency: { ...prev.currency, currency_enable: e.target.checked }
                                            }))}
                                        />
                                        <Typography variant="caption">Enable Currency</Typography>
                                    </Box>
                                    {formData.currency?.currency_enable && (
                                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                                            {Object.entries(formData.currency).map(([key, value]) =>
                                                key !== 'currency_enable' && (
                                                    <TextField
                                                        key={key}
                                                        label={labelify(key)}
                                                        name={`currency.${key}`}
                                                        value={value}
                                                        onChange={handleChange}
                                                        size="small"
                                                        sx={{ flex: 1 }}
                                                    />
                                                )
                                            )}
                                        </Box>
                                    )}
                                </Box>

                                {/* Items */}
                                {formData.items.map((item, index) => {
                                    if (item.deleted) return null;
                                    return (
                                        <Box key={item.id ?? index} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                                            {Object.keys(item).map((key) => {
                                                if (key === 'deleted') return null;
                                                if (key === 'price' && !formData.items_price) return null;
                                                return (
                                                    <TextField
                                                        key={`${index}-${key}`}
                                                        label={labelify(key)}
                                                        name={`items.${index}.${key}`}
                                                        value={item[key]}
                                                        onChange={handleChange}
                                                        size="small"
                                                        fullWidth
                                                        multiline={key === 'body'}
                                                        rows={key === 'body' ? 3 : undefined}
                                                        sx={{ mb: 1.5 }}
                                                    />
                                                );
                                            })}
                                            <Button
                                                variant="contained"
                                                size="small"
                                                type="button"
                                                color="error"
                                                sx={{ textTransform: 'none' }}
                                                onClick={() => removeItem(index)}
                                            >
                                                Remove
                                            </Button>
                                        </Box>
                                    );
                                })}

                                <Button type="button" variant="outlined" color="info" size="small" sx={{ textTransform: 'none' }} onClick={addItem}>
                                    Add Item
                                </Button>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Bank Details</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('bank_detail', 'bank_detail')}
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={tabstyle}>
                                <Typography component="span">Payment Terms</Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 2 }}>
                                {renderFields('payment_terms', 'payment_terms')}
                            </AccordionDetails>
                        </Accordion>

                    </form>
                </Box>
```

