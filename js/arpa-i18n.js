/**
 * ARPA Suite – UI internationalization (ES / EN)
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'arpa_lang';
  var currentLang = 'es';
  var defaultsCaptured = false;
  var brandDefaultsCaptured = false;
  var brandDefaults = {};
  var I18N_ES = {};

  var I18N_EN = {
    'license_gate.title': 'ARPA Suite',
    'license_gate.subtitle': 'Enter your license code to activate the platform.',
    'license_gate.label_code': 'License code',
    'license_gate.placeholder_code': 'Your license code',
    'license_gate.btn_verify': 'Verify',
    'license_gate.btn_verifying': 'Verifying…',
    'license_gate.loading': 'Activating your 7-day trial…',
    'license_gate.validating': 'Verifying license…',
    'license_gate.expired_title': 'Your 7-day trial has ended.',
    'license_gate.expired_sub': 'Choose a plan to keep using ARPA Suite. You will receive your code by email after purchase.',
    'license_gate.btn_pro': 'Buy Pro plan',
    'license_gate.btn_pyme': 'Buy PYME plan',
    'license_gate.btn_whatsapp': 'Questions? Message us on WhatsApp',
    'license_gate.have_code': 'Already have a Pro or PYME code?',
    'license_gate.enter_code': 'Enter it here',
    'license_gate.retry_trial': 'Retry automatic activation',
    'license_gate.btn_continue_trial': 'Continue with free trial',
    'license_gate.error_required': 'Enter your license code.',
    'license_gate.error_invalid': 'Invalid license code.',
    'license_gate.error_network': 'Could not verify license. Check your connection and try again.',
    'license_gate.error_trial': 'Could not activate trial. Enter your code or retry.',

    'trial_capture.title': 'Welcome to ARPA Suite',
    'trial_capture.title_achievement': 'Keep going with ARPA Suite!',
    'trial_capture.subtitle_achievement': 'Complete the form in under a minute. We will remind you on WhatsApp before your free trial ends.',
    'trial_capture.subtitle_backup': 'Leave a WhatsApp contact so we can remind you before your trial ends and help if you need it.',
    'trial_capture.title_after_save': 'Your {doc} was saved!',
    'trial_capture.subtitle_after_save': 'To support you during the trial, confirm your name, trade, and a WhatsApp contact number.',
    'trial_capture.doc_formato': 'Service Form',
    'trial_capture.doc_cotizacion': 'Quote',
    'trial_capture.label_name': 'Full name',
    'trial_capture.label_oficio': 'Main trade',
    'trial_capture.oficio_placeholder': 'Select your main trade…',
    'trial_capture.label_phone': 'WhatsApp (with country code)',
    'trial_capture.placeholder_name': 'E.g. John Smith',
    'trial_capture.placeholder_phone': 'E.g. +52 55 1234 5678',
    'trial_capture.btn_start': 'Continue to the app',
    'trial_capture.btn_submit': 'Save and continue',
    'trial_capture.btn_submit_modal': 'Send details',
    'trial_capture.error_name': 'Enter your name.',
    'trial_capture.error_oficio': 'Select your trade.',
    'trial_capture.error_phone': 'Enter a valid WhatsApp number with country code.',

    'onboarding.title': 'Welcome to ARPA Suite',
    'onboarding.subtitle_rubro': 'What is your main line of business?',
    'onboarding.rubro.automatizacion': 'Automation',
    'onboarding.rubro.aire_acondicionado': 'Air Conditioning',
    'onboarding.rubro.electricidad': 'Electrical',
    'onboarding.rubro.otro': 'Other',
    'onboarding.demo.title': 'BFT, Accessmatic, Elite & NAS Catalog',
    'onboarding.demo.text': 'Would you like to preload the base catalog?',
    'onboarding.demo.btn_skip': 'Skip, start empty',
    'onboarding.demo.btn_yes': 'Yes, load catalog',
    'onboarding.otro.title': 'How ARPA Suite works',
    'onboarding.otro.text_intro': "You'll fill out this form on-site, from your phone.",
    'onboarding.otro.item1': '📋 Fill in the service details — takes 2 minutes',
    'onboarding.otro.item2': '📄 Generate the professional PDF instantly',
    'onboarding.otro.item3': '💬 Share it on WhatsApp or save it — free for the first 7 days',
    'onboarding.otro.btn_continue': 'Got it, let\'s start →',

    'header.validation_badge': 'Arpa Suite',
    'header.validation_badge_ready': 'Arpa Suite · Ready',
    'header.lang.aria': 'Language',
    'header.settings.title': 'Company settings',
    'header.settings.aria': 'Company settings',
    'header.doc_type.formato': 'Service Form',
    'header.doc_type.cotizacion': '💰 Quote',
    'header.doc_type.catalogo': '📦 My Catalog',
    'header.doc_type.cuenta_cobro': '🧾 Invoice',
    'header.doc_type.historial': '📋 Service History',
    'header.number_label': 'No.',
    'header.btn_new_number': '+ NEW No.',
    'header.placeholder.formato_number': '0001',
    'header.placeholder.cot_number': 'COT-001',
    'header.placeholder.cc_number': 'CC-001',
    'header.title.tap_new_number': 'Tap to generate new number',

    'menu.aria': 'Main menu',
    'menu.formato': 'Form',
    'menu.cotizacion': 'Quote',
    'menu.catalogo': 'Catalog',
    'menu.historial': 'History',
    'menu.cuenta_cobro': 'Invoice',
    'menu.configuracion': 'Settings',
    'menu.fab_add.aria': 'Add',

    'formato.section.tipo_servicio': 'Service Type',
    'formato.tipo.instalacion': '⚙️ Installation',
    'formato.tipo.mantenimiento': '🔧 Maintenance',
    'formato.tipo.reparacion': '🛠 Repair',
    'formato.section.datos_cliente': 'Client Details',
    'formato.label.nombre_empresa': 'Name / Company',
    'formato.placeholder.nombre_empresa': 'Full name or company name',
    'formato.label.nit_cedula': 'Tax ID / ID Number',
    'formato.placeholder.nit_cedula': '000.000.000-0',
    'formato.label.telefono': 'Phone',
    'formato.placeholder.telefono': 'Contact number',
    'formato.label.direccion_instalacion': 'Installation address',
    'formato.placeholder.direccion': 'Street, avenue, neighborhood...',
    'formato.label.ciudad': 'City',
    'formato.placeholder.ciudad': 'Medellín',
    'formato.label.fecha': 'Date',
    'formato.section.tecnico': 'Responsible Technician',
    'formato.label.tecnico': 'Technician',
    'formato.placeholder.tecnico': 'Technician name',
    'formato.label.auxiliar': 'Assistant (if applicable)',
    'formato.placeholder.auxiliar': 'Assistant name',
    'formato.section.tipo_puerta': 'Door / Motor Type',
    'formato.puerta.corrediza': 'Sliding',
    'formato.puerta.batiente_1': 'Single swing',
    'formato.puerta.batiente_2': 'Double swing',
    'formato.puerta.levadiza': 'Lift',
    'formato.puerta.seccional': 'Sectional',
    'formato.puerta.barrera': 'Vehicle barrier',
    'formato.puerta.techo_corredizo': 'Skylight',
    'formato.puerta.cortina_enrollable': 'Roller shutter',
    'formato.puerta.otra': 'Other',
    'formato.placeholder.tipo_otra': 'Specify...',
    'formato.titulo.electricidad': 'Electrical Work Type',
    'formato.titulo.metalmecanica': 'Metalwork Type',
    'formato.titulo.solar': 'Solar System Type',
    'formato.titulo.refrigeracion': 'Equipment Type',
    'formato.titulo.cctv': 'Security System Type',
    'formato.titulo.plomeria': 'Plumbing Work Type',
    'formato.titulo.gas': 'Gas Work Type',
    'formato.titulo.plagas': 'Service Type',
    'formato.titulo.linea_blanca': 'Appliance Type',
    'formato.electricidad.residencial': 'Residential installation',
    'formato.electricidad.comercial': 'Commercial/industrial',
    'formato.electricidad.tablero': 'Electrical panel',
    'formato.electricidad.acometida': 'Service entrance',
    'formato.electricidad.iluminacion': 'Lighting',
    'formato.electricidad.tomas': 'Outlets and circuits',
    'formato.electricidad.tierra': 'Grounding',
    'formato.metalmecanica.puerta': 'Metal door/gate',
    'formato.metalmecanica.reja': 'Grille/enclosure',
    'formato.metalmecanica.escalera': 'Stair/railing',
    'formato.metalmecanica.estructura': 'Metal structure',
    'formato.metalmecanica.soldadura': 'Welding/repair',
    'formato.solar.panel': 'Solar panel',
    'formato.solar.inversor': 'Inverter',
    'formato.solar.baterias': 'Batteries',
    'formato.solar.estructura': 'Structure/mounting',
    'formato.solar.cableado': 'DC/AC wiring',
    'formato.solar.mantenimiento': 'Maintenance/cleaning',
    'formato.refrigeracion.nevera': 'Refrigerator/freezer',
    'formato.refrigeracion.split': 'Split AC',
    'formato.refrigeracion.central': 'Central AC',
    'formato.refrigeracion.cuarto_frio': 'Cold room',
    'formato.refrigeracion.comercial': 'Commercial refrigeration',
    'formato.gas.interna': 'Internal installation',
    'formato.gas.domestico': 'Gas appliance',
    'formato.gas.revision': 'Regulatory inspection',
    'formato.gas.fuga': 'Leak repair',
    'formato.gas.calentador': 'Water heater',
    'formato.cctv.analogas': 'Analog cameras',
    'formato.cctv.ip': 'IP cameras',
    'formato.cctv.dvr': 'DVR/NVR',
    'formato.cctv.alarma': 'Alarm',
    'formato.cctv.acceso': 'Access control',
    'formato.cctv.videoportero': 'Video intercom',
    'formato.plomeria.hidraulica': 'Water supply network',
    'formato.plomeria.sanitaria': 'Drainage network',
    'formato.plomeria.fuga': 'Leak/repair',
    'formato.plomeria.calentador': 'Water heater',
    'formato.plomeria.griferia': 'Fixtures/sanitaryware',
    'formato.plomeria.bomba': 'Pump/pressure',
    'formato.plagas.desinsectacion': 'Insect control',
    'formato.plagas.desratizacion': 'Rodent control',
    'formato.plagas.desinfeccion': 'Disinfection',
    'formato.plagas.fumigacion': 'General fumigation',
    'formato.plagas.preventivo': 'Preventive control',
    'formato.linea_blanca.lavadora': 'Washing machine',
    'formato.linea_blanca.nevera': 'Refrigerator',
    'formato.linea_blanca.estufa': 'Stove/oven',
    'formato.linea_blanca.secadora': 'Dryer',
    'formato.linea_blanca.lavavajillas': 'Dishwasher',
    'formato.section.medidas': 'Opening Dimensions',
    'formato.label.ancho_a': 'Width A (m)',
    'formato.label.alto_h': 'Height H (m)',
    'formato.label.md': 'MD (m)',
    'formato.label.mi': 'MI (m)',
    'formato.placeholder.dimension': '0.00',
    'formato.label.peso': 'Approx. weight (kg)',
    'formato.placeholder.peso': 'kg',
    'formato.label.material_puerta': 'Door material',
    'formato.placeholder.material_puerta': 'Iron, aluminum...',
    'formato.section.equipo': 'Installed Equipment',
    'formato.label.marca': 'Brand',
    'formato.label.marca_motor': 'Motor brand',
    'formato.placeholder.marca': 'E.g.: Samsung, LG...',
    'formato.select.seleccionar': 'Select...',
    'formato.select.otra_marca': 'Other',
    'formato.label.referencia_modelo': 'Reference / Model',
    'formato.select.seleccionar_referencia': 'Select reference...',
    'formato.placeholder.referencia_manual': 'E.g.: ARES 1500',
    'formato.placeholder.ref.metalmecanica': 'E.g.: Gate 3x2.5m',
    'formato.placeholder.ref.refrigeracion': 'E.g.: Midea 12,000 BTU',
    'formato.placeholder.ref.cctv': 'E.g.: Hikvision DS-2CD2043G2',
    'formato.placeholder.ref.solar': 'E.g.: JA Solar 450W',
    'formato.placeholder.ref.linea_blanca': 'E.g.: Samsung washer 18kg',
    'formato.label.serie_codigo': 'Serial / Code',
    'formato.placeholder.serie': 'Serial number',
    'formato.label.voltaje': 'Voltage',
    'formato.label.accesorios': 'Included accessories',
    'formato.accesorio.control_remoto': 'Remote control',
    'formato.accesorio.teclado': 'Numeric keypad',
    'formato.accesorio.fotocelda': 'Photocell',
    'formato.accesorio.sensor_apertura': 'Opening sensor',
    'formato.accesorio.bateria': 'Backup battery',
    'formato.accesorio.cierre_automatico': 'Auto close',
    'formato.accesorio.tarjeta_lector': 'Card / reader',
    'formato.section.materiales': 'Materials Used',
    'formato.mat.header.descripcion': 'Material / Description',
    'formato.mat.header.unidad': 'Unit',
    'formato.mat.header.cant': 'Qty.',
    'formato.mat.placeholder.ej1': 'E.g.: 1/2" conduit pipe',
    'formato.mat.placeholder.ej2': 'E.g.: 40x20 rectangular tube',
    'formato.mat.placeholder.ej3': 'E.g.: #12 sheathed cable',
    'formato.mat.placeholder.ej4': 'E.g.: Screws and anchors',
    'formato.mat.placeholder.ml': 'lm',
    'formato.mat.placeholder.cero': '0',
    'formato.mat.placeholder.und': 'unit',
    'formato.mat.placeholder.otro': 'Other material...',
    'formato.section.fotos': 'Photo Record',
    'formato.foto.badge_antes': 'Before',
    'formato.foto.label_antes': 'Before Photo',
    'formato.foto.btn_galeria': '🖼 Gallery / Camera',
    'formato.foto.badge_despues': 'After',
    'formato.foto.label_despues': 'After Photo',
    'formato.section.observaciones': 'Notes and Recommendations',
    'formato.placeholder.obs1': 'Note 1...',
    'formato.placeholder.obs2': 'Note 2...',
    'formato.placeholder.obs3': 'Note 3...',
    'formato.placeholder.obs4': 'Note 4...',
    'formato.nota.label': 'Note:',
    'formato.nota.body': 'The client must provide an electrical outlet (110V–220V) with ground for installation, including wiring and conduit for sensors if required.',
    'formato.section.garantia': 'Warranty Terms',
    'formato.garantia.header_static': 'Warranty Terms',
    'formato.garantia.header': 'Warranty – {company}',
    'formato.garantia.tiempo.label': 'Warranty period:',
    'formato.garantia.tiempo.body': 'Labor warranty is 1 year from the service date. Equipment has a 2-year warranty against manufacturing defects.',
    'formato.garantia.mantenimiento.label': 'Preventive maintenance:',
    'formato.garantia.mantenimiento.body': 'We recommend maintenance every 6 months with our technical team. This extends equipment life, prevents failures, and maintains optimal operating conditions.',
    'formato.garantia.exclusiones.label': 'Warranty exclusions:',
    'formato.garantia.exclusiones.body_static': 'The warranty does not apply to damage from external causes, electrical surges, or unauthorized personnel intervention.',
    'formato.garantia.exclusiones.body': '<strong>Warranty exclusions:</strong> The warranty does not apply to damage caused by electrical surges, overvoltage, lightning, or other external causes. It also does not apply when the equipment has been serviced by <strong>personnel not authorized by {company}</strong>.',
    'formato.section.video': 'Delivery Video',
    'formato.video.label': 'Delivery Video Link (Google Drive/YouTube) - Optional',
    'formato.video.placeholder': 'https://drive.google.com/... or https://youtube.com/...',
    'formato.section.firmas': 'Acceptance and Signatures',
    'formato.firma.cliente': 'Client Signature',
    'formato.firma.tecnico': 'Technician Signature',
    'formato.firma.tecnico_named': 'Technician Signature – {name}',
    'formato.firma.btn_borrar': 'Clear',
    'formato.firma.aria_cliente': 'Client signature canvas',
    'formato.firma.aria_tecnico': 'Technician signature canvas',
    'formato.firma.placeholder.nombre': 'Full name',
    'formato.firma.placeholder.doc': 'ID / Tax ID',
    'formato.firma.placeholder.tecnico': 'Technician name',
    'formato.firma.placeholder.id_tecnico': 'Technician ID',
    'formato.video_qr.title': 'Equipment delivery video',
    'formato.video_qr.aria': 'Delivery video QR code',
    'formato.video_qr.hint': 'Scan the code to watch the equipment delivery video',
    'formato.verification': 'Document issued by <strong id="brand-verification-company">{company}</strong> through <strong>Arpa Suite</strong>.',
    'formato.section.datos_bancarios': 'Bank Details',

    'cot.section.datos_cliente': 'Client Details',
    'cot.label.correo': 'Email',
    'cot.placeholder.correo': 'email@example.com',
    'cot.label.valida_hasta': 'Valid until',
    'cot.section.cobros': 'Charges',
    'cot.btn_agregar_item': '+ Add additional item',
    'cot.section.buscar': 'Search and Add Products',
    'cot.label.producto': 'Product',
    'cot.placeholder.buscar': '🔍 Search by name or code...',
    'cot.label.cant': 'Qty.',
    'cot.hint.catalogo': 'Go to My Catalog to add your products',
    'cot.section.productos': 'Quoted Products and Services',
    'cot.table.codigo': 'Code',
    'cot.table.descripcion': 'Description',
    'cot.table.cant': 'Qty.',
    'cot.table.pvp_unit': 'Unit Price',
    'cot.table.total': 'Total',
    'cot.table.empty': 'Add products, services, or additional items',
    'cot.section.resumen': 'Quote Summary',
    'cot.iva.toggle': 'Include VAT 19%',
    'cot.total.subtotal': 'Subtotal',
    'cot.total.iva': 'VAT (19%)',
    'cot.total.grand': 'TOTAL',
    'cot.section.datos_bancarios': 'Bank Details',
    'cot.section.observaciones': 'Notes',
    'cot.placeholder.obs': 'Additional specifications, notes for the client...',
    'cot.section.aprobacion': 'Approval',
    'cot.firma.aprobado_cliente': 'Approved by (Client)',
    'cot.firma.elaborado': 'Prepared by',
    'cot.firma.elaborado_named': 'Prepared by – {name}',
    'cot.firma.aria_cliente': 'Client quote signature',
    'cot.firma.aria_elaborado': 'Prepared-by quote signature',
    'cot.nota_legal': '<strong>Note:</strong> Quote valid for <strong>15 calendar days</strong>. Prices in {moneda_nombre} ({moneda_codigo}).',

    'cat.section.categorias': 'Categories',
    'cat.section.productos': 'Products',
    'cat.intro': 'Your products are grouped by category. Quote will use this catalog when items are loaded.',
    'cat.placeholder.buscar': '🔍 Search by name or reference…',
    'cat.btn.importar': '📥 Import Excel/CSV',
    'cat.btn.cargar_accessmatic': '📦 Load Accessmatic',
    'cat.btn.cargar_elite': '📦 Load Elite',
    'cat.btn.cargar_bft_nas': '📦 Load BFT + NAS',
    'cat.btn.cargar_ppa': '📦 Load PPA',
    'cat.empty': 'No products yet.<br>Tap <strong>+</strong> to add the first one.',
    'cat.oficio.intro': 'Editable starter catalog. Adjust prices and products for your business.',
    'cat.btn.agregar_producto': '+ Add product',
    'cat.btn.cargar_catalogo_base': '📦 Load starter catalog',
    'cat.cat_empty': 'Create your categories first. E.g.: Motors, Parts, Services, Materials…',

    'oficio.automatismos': 'Gate Automation',
    'oficio.electricidad': 'Electrical',
    'oficio.gas': 'Gas',
    'oficio.refrigeracion': 'Refrigeration & Air Conditioning',
    'oficio.cctv': 'CCTV / Electronic Security',
    'oficio.plomeria': 'Plumbing',
    'oficio.metalmecanica': 'Metalwork & Welding',
    'oficio.plagas': 'Pest Control / Fumigation',
    'oficio.linea_blanca': 'White Goods / Appliances',
    'oficio.solar': 'Solar Energy',

    'settings.section.oficios': 'Your main trade',
    'settings.oficios.hint': 'Choose your line of business. Only one trade can be active (Founder license excepted). Each trade includes an editable starter catalog in My Catalog.',

    'cc.section.datos_documento': 'Document Details',
    'cc.placeholder.ciudad': 'City',
    'cc.label.fecha_emision': 'Issue date',
    'cc.label.fecha_vencimiento': 'Due date',
    'cc.section.cobrador': 'Collector',
    'cc.cobrador.hint': 'Data from Company Settings.',
    'cc.cobrador.tecnico_dueno': 'Technician / Owner',
    'cc.cobrador.cedula_nit': 'Personal ID / Tax ID',
    'cc.cobrador.empresa': 'Company',
    'cc.cobrador.nit_empresa': 'Company Tax ID',
    'cc.cobrador.telefono': 'Phone',
    'cc.cobrador.direccion': 'Address',
    'cc.section.cliente': 'Client',
    'cc.placeholder.cliente_nombre': 'Client name',
    'cc.label.nit_cc': 'Tax ID / ID No.',
    'cc.placeholder.direccion_cliente': 'Client address',
    'cc.section.servicios': 'Services',
    'cc.table.descripcion': 'Description',
    'cc.table.valor_unitario': 'Unit value',
    'cc.btn.agregar_servicio': '+ Add service',
    'cc.section.totales': 'Totals',
    'cc.retencion.toggle': 'Withholding tax',
    'cc.retencion.pct_label': '% Withholding',
    'cc.total.retencion': 'Withholding',
    'cc.total.grand': 'TOTAL DUE',
    'cc.section.datos_pago': 'Payment Details',
    'cc.label.banco': 'Bank',
    'cc.placeholder.banco': 'E.g. Bancolombia, Nequi…',
    'cc.label.tipo_cuenta': 'Account type',
    'cc.cuenta.ahorros': 'Savings',
    'cc.cuenta.corriente': 'Checking',
    'cc.label.numero_cuenta': 'Account number',
    'cc.label.titular': 'Account holder',
    'cc.placeholder.titular': 'Account holder name',
    'cc.label.nit_titular': 'Holder Tax ID / ID',
    'cc.placeholder.doc_titular': 'Holder document',
    'cc.section.observaciones': 'Notes',
    'cc.placeholder.obs': 'Additional notes for the client...',
    'cc.section.firmas': 'Signatures',
    'cc.firma.cobrador': 'Collector',
    'cc.firma.cliente': 'Client',
    'cc.firma.label': 'Signature',
    'cc.btn.limpiar': '🗑 Clear',
    'cc.btn.whatsapp': '💬 WhatsApp',
    'cc.btn.pdf': '📄 Generate PDF',

    'hist.section.title': 'Service History',
    'hist.intro': 'Records saved when exporting PDF from the Service Form. Maximum 200 services.',
    'hist.empty': 'No services in history yet.<br>Save a form as PDF to record the first service.',
    'hist.btn.export_csv': 'Export History CSV',

    'pdf.btn.guardar_formato': '📄 Save as PDF',
    'pdf.btn.whatsapp_formato': '📲 Send via WhatsApp',
    'pdf.btn.guardar_cot': '📄 Save as PDF',
    'pdf.btn.whatsapp_cot': '📲 Send via WhatsApp',

    'footer.aria': 'Footer',
    'footer.global.rights': 'All rights reserved.',

    'import.title': 'Import preview',
    'import.table.nombre': 'Name',
    'import.table.ref': 'Ref.',
    'import.table.precio': 'Price',
    'import.table.unidad': 'Unit',
    'import.table.marca': 'Brand',
    'import.table.categoria': 'Category',
    'import.table.estado': 'Status',
    'import.btn.cancel': 'Cancel',
    'import.btn.add': 'Add to existing',
    'import.btn.replace': 'Replace catalog',

    'cat_modal.title.new': 'New category',
    'cat_modal.label.nombre': 'Category name',
    'cat_modal.placeholder.nombre': 'E.g. Motors, Parts, Services…',

    'prod_modal.title.new': 'New product',
    'prod_modal.label.nombre': 'Name',
    'prod_modal.placeholder.nombre': 'Product or service name',
    'prod_modal.label.referencia': 'Reference',
    'prod_modal.placeholder.referencia': 'Unique code or reference',
    'prod_modal.label.precio': 'Unit price',
    'prod_modal.label.unidad': 'Unit',
    'prod_modal.unidad.unidad': 'Unit',
    'prod_modal.unidad.metro': 'Meter',
    'prod_modal.unidad.hora': 'Hour',
    'prod_modal.unidad.servicio': 'Service',
    'prod_modal.label.marca_optional': 'Brand (optional)',
    'prod_modal.placeholder.marca': 'Product brand',
    'prod_modal.label.categoria': 'Category',

    'common.btn.cancel': 'Cancel',
    'common.btn.save': 'Save',

    'settings.title': '⚙️ Company Settings',
    'settings.close.aria': 'Close',
    'settings.label.company': 'Company Name',
    'settings.placeholder.company': 'Your company name',
    'settings.label.nit': 'Tax ID',
    'settings.label.address': 'Address',
    'settings.placeholder.address': 'Business address',
    'settings.label.city_optional': 'City (optional)',
    'settings.label.phone': 'Phone',
    'settings.placeholder.phone': 'Contact phone',
    'settings.label.website_optional': 'Website (optional)',
    'settings.placeholder.website': 'https://your-company.com',
    'settings.section.bank': 'Bank Details',
    'settings.label.bank': 'Bank',
    'settings.placeholder.bank': 'Bank name',
    'settings.label.account_type': 'Account type',
    'settings.label.account_number': 'Account number',
    'settings.placeholder.account_number': 'Account number',
    'settings.label.account_holder_optional': 'Account holder (optional)',
    'settings.label.holder_doc_optional': 'Holder Tax ID / ID (optional)',
    'settings.label.technician_optional': 'Technician name (optional)',
    'settings.placeholder.technician': 'Responsible technician name',
    'settings.label.technician_doc_optional': 'Technician ID / Tax ID (optional)',
    'settings.label.technician_code': 'Technician initials or code',
    'settings.placeholder.technician_code': 'PJ',
    'settings.technician_code.hint': 'PYME plan: required. Prefixes your documents (e.g. PJ-001). Other plans: optional.',
    'settings.label.logo': 'Your company logo',
    'settings.logo.hint': 'Upload your logo (PNG, JPG or WebP). If none is uploaded, the official ARPA Suite logo will be used.',
    'settings.section.price_list': 'Price List',
    'settings.price_list.hint': 'Base values for recurring services. Applied in Quote (editable before PDF).',
    'settings.btn.cancel': 'Cancel',
    'settings.btn.save': 'Save',

    'alert.cotizacion.pdf_descargado_wa': 'The quote PDF was downloaded. Attach it in the WhatsApp chat that will open next.',
    'alert.pdf.no_generado_manual': 'The PDF could not be generated. Attach it manually from your gallery or recent files.',
    'alert.pdf.jspdf_no_cargo': 'jsPDF could not load. Reload the app and try again.',
    'alert.pdf.adjuntar_manual': 'Attach the PDF manually from your gallery or recent files.',
    'alert.cuenta_cobro.pdf_no_generado': 'The PDF could not be generated. Your form data was kept; please try again.',
    'alert.historial.registro_no_encontrado': 'Record not found.',
    'alert.historial.documento_restaurado': 'Document restored. Review the data and generate the PDF.',
    'confirm.historial.eliminar_registro': 'Delete this record from the history?',
    'alert.historial.no_hay_registros': 'No records to export.',
    'confirm.catalogo.eliminar_producto': 'Delete "{label}" from the catalog?',
    'alert.catalogo.no_eliminar_categoria': 'Cannot delete: there are {count} product(s) in this category.',
    'confirm.catalogo.eliminar_categoria': 'Delete the category "{name}"?',
    'alert.catalogo.formato_no_soportado': 'Unsupported format. Use .xlsx, .xls or .csv',
    'alert.catalogo.sin_productos_encontrados': 'No products found. Make sure the first row has these columns: Name, Reference, Price, Unit, Brand, Category.',
    'alert.catalogo.error_leer_archivo': 'Error reading the file: {detail}',
    'alert.catalogo.formato_invalido': 'invalid format',
    'confirm.catalogo.reemplazar': 'Replace this trade\'s catalog with these {count} products?',
    'confirm.catalogo.agregar': 'Add these {count} products to the existing ones for this trade?',
    'alert.catalogo.reemplazado': 'Catalog replaced: {count} products imported.',
    'alert.catalogo.agregados': '{count} products added.',
    'alert.catalogo.omitidos': '{count} skipped due to duplicate reference.',
    'alert.numeracion.configure_iniciales_pyme': 'On the PYME plan, set the technician initials in Settings.',
    'alert.oficios.sin_catalogo_base': 'No base catalog available for this trade.',
    'alert.oficios.catalogo_base_cargado': 'Base catalog loaded: {count} product(s) added in {label}.',
    'alert.oficios.catalogo_ya_cargado': 'The base catalog for {label} was already loaded ({total} products). No duplicates were added.',
    'confirm.oficios.cambiar_oficio': 'You are about to change from {from} to {to}. This will remove {from}\'s products from your catalog (items you added manually in other categories are not affected). Continue?',
    'alert.catalogo.no_guardado': 'The catalog could not be saved. Try again.',
    'alert.catalogo.marca_cargado': '{marca} catalog loaded: {count} products.',
    'alert.catalogo.modulo_no_disponible': 'The brand catalog module is not available.',

    'alert.brand.logo_no_guardado_quota': 'The logo could not be saved. Try a smaller image or a different format.',
    'alert.brand.config_no_guardada': 'The settings could not be saved. If you uploaded a logo, try a smaller image.',
    'alert.brand.imagen_invalida': 'Select a valid image (PNG, JPG or WebP).',
    'alert.brand.imagen_muy_grande': 'The image is too large. Maximum ~15 MB.',
    'alert.brand.imagen_no_procesada': 'The image could not be processed. Try a different photo.',
    'alert.brand.imagen_no_leida': 'The image could not be read.',
    'alert.brand.campos_obligatorios': 'Fill in all required fields marked with *.',
    'alert.brand.pyme_codigo_requerido': 'On the PYME plan you must enter the technician initials or code (e.g. PJ).',
    'alert.brand.codigo_tecnico_formato': 'Use 2 to 4 letters or numbers for the technician code.',
    'alert.numeracion.pyme_codigo_y_guardar': 'On the PYME plan, enter the technician initials or code (e.g. PJ) and save the settings.',
    'alert.catalogo.nombre_obligatorio': 'Name is required.',
    'alert.catalogo.referencia_obligatoria': 'Reference is required.',
    'alert.catalogo.precio_invalido': 'Enter a valid unit price.',
    'alert.catalogo.categoria_invalida': 'Select a valid category.',
    'alert.catalogo.referencia_duplicada': 'A product with that reference already exists.',
    'alert.catalogo.categoria_nombre_obligatorio': 'Category name is required.',
    'alert.catalogo.categoria_duplicada': 'A category with that name already exists.',
    'ui.catalogo.editar_producto': 'Edit product',
    'ui.catalogo.nuevo_producto': 'New product',
    'ui.catalogo.editar_categoria': 'Edit category',
    'ui.catalogo.nueva_categoria': 'New category',
    'ui.catalogo.crear_primera_categoria': '+ Create first category',
    'ui.catalogo.nueva_categoria_btn': '+ New category',
    'ui.catalogo.sin_resultados_busqueda': 'No results for this search.',
    'aria.catalogo.editar': 'Edit',
    'aria.catalogo.eliminar': 'Delete',
    'aria.catalogo.editar_categoria': 'Edit category',
    'aria.catalogo.eliminar_categoria': 'Delete category',
    'ui.historial.cliente': 'Client',
    'ui.historial.concepto': 'Concept',
    'ui.historial.ciudad': 'City',
    'ui.historial.fecha': 'Date',
    'ui.historial.total': 'Total',
    'ui.historial.eliminar': 'Delete',
    'aria.historial.eliminar_registro': 'Delete record',
    'ui.historial.ver_documento': 'View document',
    'ui.historial.sin_descripcion': 'No description',
    'ui.cotizacion.sin_resultados': 'No results',
    'ui.cotizacion.tabla_vacia': 'Add products or invoice items',
    'alert.firma.falta_firma_cliente': 'The customer signature is missing to generate the document.',
    'onboarding.demo.titulo': 'Accessmatic, BFT, Elite and NAS Catalog',
    'onboarding.demo.pregunta': 'Do you want to preload {count} products?',

    'brand.banco.configurar': 'Set up your bank details in Settings ⚙️',
    'brand.banco.completar': 'Complete the bank name and account number in Settings ⚙️',
    'brand.banco.linea': 'Payment details: {bank} · {tipo} Account · No. {numero}',
    'cobros.vacio': 'No charge items. Use + to add one.',
    'cobros.descripcion': 'Description',
    'cobros.descripcion_placeholder': 'Item description',
    'cobros.valor_cop': 'Value ({moneda})',
    'cobros.quitar': 'Remove',
    'cobros.item_generico': 'Charge item',
    'pricing.default.instalacion': 'Installation',
    'pricing.default.visita_tecnica': 'Technical Visit',
    'pricing.default.mantenimiento': 'Preventive Maintenance',
    'pricing.default.reparacion': 'Repair',
    'pricing.default.mano_obra': 'Labor (hour)',
    'brand.footer.global': 'Generated with ARPA Suite · Try it free at arpatechnologyglobal.com · © 2026',
    'brand.company_name.placeholder': 'YOUR COMPANY NAME',
    'brand.company_contact.placeholder': 'Set up your company in <strong>⚙️ Settings</strong> to personalize this document.',
    'brand.screen_footer.placeholder': 'Set up your company details in ⚙️ Settings',
    'settings.section.currency': 'Currency',
    'settings.label.currency': 'Currency for your documents',
    'currency.cop': '🇨🇴 COP — Colombian peso',
    'currency.usd': '🇺🇸 USD — US dollar',
    'currency.mxn': '🇲🇽 MXN — Mexican peso',
    'currency.pen': '🇵🇪 PEN — Peruvian sol',
    'currency.clp': '🇨🇱 CLP — Chilean peso',
    'currency.name.cop': 'Colombian pesos',
    'currency.name.usd': 'US dollars',
    'currency.name.mxn': 'Mexican pesos',
    'currency.name.pen': 'Peruvian soles',
    'currency.name.clp': 'Chilean pesos'
  };

  var DOC_TYPE_KEYS = {
    formato: 'header.doc_type.formato',
    cotizacion: 'header.doc_type.cotizacion',
    catalogo: 'header.doc_type.catalogo',
    'cuenta-cobro': 'header.doc_type.cuenta_cobro',
    historial: 'header.doc_type.historial'
  };

  function readStoredLang() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'es') return stored;
    } catch (e) { /* ignore */ }
    return 'es';
  }

  function interpolate(str, vars) {
    if (!str || !vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (_, key) {
      return vars[key] != null ? vars[key] : '{' + key + '}';
    });
  }

  function getLang() {
    return currentLang;
  }

  function t(key, vars) {
    var dict = currentLang === 'en' ? I18N_EN : I18N_ES;
    var text = dict[key];
    if (text == null && currentLang === 'en') text = I18N_EN[key];
    if (text == null) text = key;
    return interpolate(text, vars);
  }

  function translateIn(key, lang) {
    var dict = lang === 'en' ? I18N_EN : I18N_ES;
    var text = dict[key];
    if (text == null) text = key;
    return text;
  }

  function storeDefaultKey(key, value) {
    if (key && value != null && I18N_ES[key] == null) {
      I18N_ES[key] = value;
    }
  }

  function supplementSpanishKeys() {
    Object.assign(I18N_ES, {
      'header.doc_type.cotizacion': '💰 Cotización',
      'header.doc_type.catalogo': '📦 Mi Catálogo',
      'header.doc_type.cuenta_cobro': '🧾 Cuenta de Cobro',
      'header.doc_type.historial': '📋 Historial de Servicios',
      'header.validation_badge_ready': 'Arpa Suite · Listo',
      'formato.garantia.header': 'Garantía – {company}',
      'formato.garantia.exclusiones.body': '<strong>Exclusiones de garantía:</strong> La garantía no aplica sobre daños causados por descargas eléctricas, sobretensiones, rayos u otras causas externas. Tampoco aplica cuando el equipo ha sido intervenido por <strong>personal no autorizado por {company}</strong>.',
      'formato.firma.tecnico_named': 'Firma Técnico – {name}',
      'cot.firma.elaborado_named': 'Elaborado por – {name}',
      'formato.puerta.cortina_enrollable': 'Cortina enrollable',
      'formato.placeholder.tipo_otra': 'Especifique...',
      'formato.titulo.electricidad': 'Tipo de Trabajo Eléctrico',
      'formato.titulo.metalmecanica': 'Tipo de Trabajo Metalmecánico',
      'formato.titulo.solar': 'Tipo de Sistema Solar',
      'formato.titulo.refrigeracion': 'Tipo de Equipo',
      'formato.titulo.cctv': 'Tipo de Sistema de Seguridad',
      'formato.titulo.plomeria': 'Tipo de Trabajo Hidráulico',
      'formato.titulo.gas': 'Tipo de Trabajo de Gas',
      'formato.titulo.plagas': 'Tipo de Servicio',
      'formato.titulo.linea_blanca': 'Tipo de Electrodoméstico',
      'cot.nota_legal': '<strong>Nota:</strong> Cotización válida por <strong>15 días calendario</strong>. Precios en {moneda_nombre} ({moneda_codigo}).',
      'alert.cotizacion.pdf_descargado_wa': 'Se descargó el PDF de la cotización. Adjúntelo en el chat de WhatsApp que se abrirá a continuación.',
      'alert.pdf.no_generado_manual': 'No se pudo generar el PDF. Adjúntelo manualmente desde su galería o archivos recientes.',
      'alert.pdf.jspdf_no_cargo': 'No se pudo cargar jsPDF. Recargue la aplicación e intente de nuevo.',
      'alert.pdf.adjuntar_manual': 'Adjunte el PDF manualmente desde su galería o archivos recientes.',
      'alert.cuenta_cobro.pdf_no_generado': 'No se pudo generar el PDF. Los datos del formulario se conservaron; intente de nuevo.',
      'alert.historial.registro_no_encontrado': 'Registro no encontrado.',
      'alert.historial.documento_restaurado': 'Documento restaurado. Revisa los datos y genera el PDF.',
      'confirm.historial.eliminar_registro': '¿Eliminar este registro del historial?',
      'alert.historial.no_hay_registros': 'No hay registros para exportar.',
      'confirm.catalogo.eliminar_producto': '¿Eliminar "{label}" del catálogo?',
      'alert.catalogo.no_eliminar_categoria': 'No se puede eliminar: hay {count} producto(s) en esta categoría.',
      'confirm.catalogo.eliminar_categoria': '¿Eliminar la categoría "{name}"?',
      'alert.catalogo.formato_no_soportado': 'Formato no soportado. Use .xlsx, .xls o .csv',
      'alert.catalogo.sin_productos_encontrados': 'No se encontraron productos. Verifique que la primera fila tenga las columnas: Nombre, Referencia, Precio, Unidad, Marca, Categoría.',
      'alert.catalogo.error_leer_archivo': 'Error al leer el archivo: {detail}',
      'alert.catalogo.formato_invalido': 'formato inválido',
      'confirm.catalogo.reemplazar': '¿Reemplazar el catálogo de este oficio con estos {count} productos?',
      'confirm.catalogo.agregar': '¿Agregar estos {count} productos a los existentes de este oficio?',
      'alert.catalogo.reemplazado': 'Catálogo reemplazado: {count} productos importados.',
      'alert.catalogo.agregados': '{count} productos agregados.',
      'alert.catalogo.omitidos': '{count} omitidos por referencia duplicada.',
      'alert.numeracion.configure_iniciales_pyme': 'En plan PYME configure las iniciales del técnico en Configuración.',
      'alert.oficios.sin_catalogo_base': 'No hay catálogo base disponible para este oficio.',
      'alert.oficios.catalogo_base_cargado': 'Catálogo base cargado: {count} producto(s) agregado(s) en {label}.',
      'alert.oficios.catalogo_ya_cargado': 'El catálogo base de {label} ya estaba cargado ({total} productos). No se agregaron duplicados.',
      'confirm.oficios.cambiar_oficio': 'Vas a cambiar de {from} a {to}. Esto eliminará los productos de {from} de tu catálogo (los que agregaste manualmente en otras categorías no se tocan). ¿Continuar?',
      'alert.catalogo.no_guardado': 'No se pudo guardar el catálogo. Intente de nuevo.',
      'alert.catalogo.marca_cargado': 'Catálogo {marca} cargado: {count} productos.',
      'alert.catalogo.modulo_no_disponible': 'El módulo de catálogos por marca no está disponible.',
      'alert.brand.logo_no_guardado_quota': 'No se pudo guardar el logo. Intente con una imagen más pequeña o en otro formato.',
      'alert.brand.config_no_guardada': 'No se pudo guardar la configuración. Si subió un logo, pruebe con una imagen más pequeña.',
      'alert.brand.imagen_invalida': 'Seleccione una imagen válida (PNG, JPG o WebP).',
      'alert.brand.imagen_muy_grande': 'La imagen es demasiado grande. Máximo ~15 MB.',
      'alert.brand.imagen_no_procesada': 'No se pudo procesar la imagen. Pruebe con otra foto.',
      'alert.brand.imagen_no_leida': 'No se pudo leer la imagen.',
      'alert.brand.campos_obligatorios': 'Complete todos los campos obligatorios marcados con *.',
      'alert.brand.pyme_codigo_requerido': 'En plan PYME debe indicar las iniciales o código del técnico (ej. PJ).',
      'alert.brand.codigo_tecnico_formato': 'Use 2 a 4 letras o números para el código del técnico.',
      'alert.numeracion.pyme_codigo_y_guardar': 'En plan PYME indique las iniciales o código del técnico (ej. PJ) y guarde la configuración.',
      'alert.catalogo.nombre_obligatorio': 'El nombre es obligatorio.',
      'alert.catalogo.referencia_obligatoria': 'La referencia es obligatoria.',
      'alert.catalogo.precio_invalido': 'Ingrese un precio unitario válido.',
      'alert.catalogo.categoria_invalida': 'Seleccione una categoría válida.',
      'alert.catalogo.referencia_duplicada': 'Ya existe un producto con esa referencia.',
      'alert.catalogo.categoria_nombre_obligatorio': 'El nombre de la categoría es obligatorio.',
      'alert.catalogo.categoria_duplicada': 'Ya existe una categoría con ese nombre.',
      'ui.catalogo.editar_producto': 'Editar producto',
      'ui.catalogo.nuevo_producto': 'Nuevo producto',
      'ui.catalogo.editar_categoria': 'Editar categoría',
      'ui.catalogo.nueva_categoria': 'Nueva categoría',
      'ui.catalogo.crear_primera_categoria': '+ Crear primera categoría',
      'ui.catalogo.nueva_categoria_btn': '+ Nueva categoría',
      'ui.catalogo.sin_resultados_busqueda': 'Sin resultados para la búsqueda.',
      'aria.catalogo.editar': 'Editar',
      'aria.catalogo.eliminar': 'Eliminar',
      'aria.catalogo.editar_categoria': 'Editar categoría',
      'aria.catalogo.eliminar_categoria': 'Eliminar categoría',
      'ui.historial.cliente': 'Cliente',
      'ui.historial.concepto': 'Concepto',
      'ui.historial.ciudad': 'Ciudad',
      'ui.historial.fecha': 'Fecha',
      'ui.historial.total': 'Total',
      'ui.historial.eliminar': 'Eliminar',
      'aria.historial.eliminar_registro': 'Eliminar registro',
      'ui.historial.ver_documento': 'Ver documento',
      'ui.historial.sin_descripcion': 'Sin descripción',
      'ui.cotizacion.sin_resultados': 'Sin resultados',
      'ui.cotizacion.tabla_vacia': 'Agregue productos o ítems de cobro',
      'alert.firma.falta_firma_cliente': 'Falta la firma del cliente para generar el documento.',
      'onboarding.demo.titulo': 'Catálogo BFT, Accessmatic, Elite y NAS',
      'onboarding.demo.pregunta': '¿Deseas precargar {count} productos?',
      'brand.banco.configurar': 'Configure datos bancarios en Ajustes ⚙️',
      'brand.banco.completar': 'Complete banco y número de cuenta en Ajustes ⚙️',
      'brand.banco.linea': 'Datos para consignación: {bank} · Cuenta {tipo} · N° {numero}',
      'cobros.vacio': 'Sin ítems de cobro. Use + para agregar.',
      'cobros.descripcion': 'Descripción',
      'cobros.descripcion_placeholder': 'Descripción del ítem',
      'cobros.valor_cop': 'Valor ({moneda})',
      'cobros.quitar': 'Quitar',
      'cobros.item_generico': 'Ítem de cobro',
      'pricing.default.instalacion': 'Instalación',
      'pricing.default.visita_tecnica': 'Visita Técnica',
      'pricing.default.mantenimiento': 'Mantenimiento Preventivo',
      'pricing.default.reparacion': 'Reparación',
      'pricing.default.mano_obra': 'Mano de Obra (hora)',
      'brand.footer.global': 'Generado con ARPA Suite · Pruébala gratis en arpatechnologyglobal.com · © 2026',
      'brand.company_name.placeholder': 'NOMBRE DE TU EMPRESA',
      'brand.company_contact.placeholder': 'Configure su empresa en <strong>⚙️ Ajustes</strong> para personalizar este documento.',
      'brand.screen_footer.placeholder': 'Configure los datos de su empresa en ⚙️ Ajustes',
      'settings.section.currency': 'Moneda',
      'settings.label.currency': 'Moneda de tus documentos',
      'currency.cop': '🇨🇴 COP — Peso colombiano',
      'currency.usd': '🇺🇸 USD — Dólar estadounidense',
      'currency.mxn': '🇲🇽 MXN — Peso mexicano',
      'currency.pen': '🇵🇪 PEN — Sol peruano',
      'currency.clp': '🇨🇱 CLP — Peso chileno',
      'currency.name.cop': 'pesos colombianos',
      'currency.name.usd': 'dólares estadounidenses',
      'currency.name.mxn': 'pesos mexicanos',
      'currency.name.pen': 'soles peruanos',
      'currency.name.clp': 'pesos chilenos'
    });
  }

  function captureDefaults() {
    if (defaultsCaptured) return;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (!key) return;
      var val = el.textContent;
      if (!el.hasAttribute('data-i18n-default')) {
        el.setAttribute('data-i18n-default', val);
      }
      storeDefaultKey(key, el.getAttribute('data-i18n-default') || val);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      if (!key) return;
      var val = el.getAttribute('placeholder') || '';
      if (!el.hasAttribute('data-i18n-default-placeholder')) {
        el.setAttribute('data-i18n-default-placeholder', val);
      }
      storeDefaultKey(key, el.getAttribute('data-i18n-default-placeholder') || val);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      if (!key) return;
      var val = el.getAttribute('title') || '';
      if (!el.hasAttribute('data-i18n-default-title')) {
        el.setAttribute('data-i18n-default-title', val);
      }
      storeDefaultKey(key, el.getAttribute('data-i18n-default-title') || val);
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-aria-label');
      if (!key) return;
      var val = el.getAttribute('aria-label') || '';
      if (!el.hasAttribute('data-i18n-default-aria')) {
        el.setAttribute('data-i18n-default-aria', val);
      }
      storeDefaultKey(key, el.getAttribute('data-i18n-default-aria') || val);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-html');
      if (!key) return;
      var val = el.innerHTML;
      if (!el.hasAttribute('data-i18n-default-html')) {
        el.setAttribute('data-i18n-default-html', val);
      }
      storeDefaultKey(key, el.getAttribute('data-i18n-default-html') || val);
    });
    defaultsCaptured = true;
  }

  function resolveText(key, lang) {
    if (lang === 'en') {
      if (I18N_EN[key] != null) return I18N_EN[key];
      if (I18N_ES[key] != null) return I18N_ES[key];
      return key;
    }
    return I18N_ES[key] != null ? I18N_ES[key] : key;
  }

  function applyAttributeSet(selector, attr, defaultAttr, lang) {
    document.querySelectorAll(selector).forEach(function (el) {
      var key = el.getAttribute(attr);
      if (!key) return;
      if (lang === 'es') {
        var def = el.getAttribute(defaultAttr);
        if (def != null) {
          if (attr === 'data-i18n-placeholder') el.setAttribute('placeholder', def);
          else if (attr === 'data-i18n-title') el.setAttribute('title', def);
          else if (attr === 'data-i18n-aria-label') el.setAttribute('aria-label', def);
          else if (attr === 'data-i18n-html') el.innerHTML = def;
          else el.textContent = def;
        }
      } else {
        var text = resolveText(key, lang);
        if (attr === 'data-i18n-placeholder') el.setAttribute('placeholder', text);
        else if (attr === 'data-i18n-title') el.setAttribute('title', text);
        else if (attr === 'data-i18n-aria-label') el.setAttribute('aria-label', text);
        else if (attr === 'data-i18n-html') el.innerHTML = text;
        else el.textContent = text;
      }
    });
  }

  function apply(lang) {
    lang = lang === 'en' ? 'en' : 'es';
    currentLang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* ignore */ }
    document.documentElement.lang = lang;
    applyAttributeSet('[data-i18n]', 'data-i18n', 'data-i18n-default', lang);
    applyAttributeSet('[data-i18n-placeholder]', 'data-i18n-placeholder', 'data-i18n-default-placeholder', lang);
    applyAttributeSet('[data-i18n-title]', 'data-i18n-title', 'data-i18n-default-title', lang);
    applyAttributeSet('[data-i18n-aria-label]', 'data-i18n-aria-label', 'data-i18n-default-aria', lang);
    applyAttributeSet('[data-i18n-html]', 'data-i18n-html', 'data-i18n-default-html', lang);
    updateLangButtons(lang);
    refreshDocTypeLabel();
    refreshBrandTexts();
    window.ArpaBrand?.applyToUI?.();
    window.ArpaCobros?.refreshDefaultLabels?.('cot');
  }

  function setLang(lang) {
    apply(lang === 'en' ? 'en' : 'es');
  }

  function updateLangButtons(lang) {
    var btnEs = document.getElementById('lang-btn-es');
    var btnEn = document.getElementById('lang-btn-en');
    if (btnEs) btnEs.classList.toggle('active', lang === 'es');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
  }

  function bindLangSwitch() {
    var btnEs = document.getElementById('lang-btn-es');
    var btnEn = document.getElementById('lang-btn-en');
    if (btnEs) {
      btnEs.addEventListener('click', function () { setLang('es'); });
    }
    if (btnEn) {
      btnEn.addEventListener('click', function () { setLang('en'); });
    }
  }

  function getCompanyName() {
    var el = document.getElementById('brand-verification-company');
    if (el && el.textContent.trim()) return el.textContent.trim();
    if (global.ArpaBrand && typeof global.ArpaBrand.getSettings === 'function') {
      var s = global.ArpaBrand.getSettings();
      if (s && s.companyName) return s.companyName.trim();
    }
    return 'Su Empresa';
  }

  function getTechnicianName() {
    if (global.ArpaBrand && typeof global.ArpaBrand.getSettings === 'function') {
      var s = global.ArpaBrand.getSettings();
      if (s && s.technicianName && s.technicianName.trim()) return s.technicianName.trim();
    }
    var tech = document.getElementById('campo-tecnico-responsable');
    if (tech && tech.value.trim()) return tech.value.trim();
    var cotNom = document.getElementById('cot-elaborado-nombre');
    if (cotNom && cotNom.value.trim()) return cotNom.value.trim();
    return '';
  }

  function captureBrandDefaultsIfNeeded() {
    if (brandDefaultsCaptured) return;
    var header = document.getElementById('brand-warranty-header');
    if (header) brandDefaults['brand-warranty-header'] = header.innerHTML;
    var exclusion = document.getElementById('brand-warranty-exclusion');
    if (exclusion) brandDefaults['brand-warranty-exclusion'] = exclusion.innerHTML;
    var companyEl = document.getElementById('brand-verification-company');
    if (companyEl && companyEl.parentElement) {
      brandDefaults['brand-verification-p'] = companyEl.parentElement.innerHTML;
    }
    var nota = document.getElementById('cot-nota-legal');
    if (nota) brandDefaults['cot-nota-legal'] = nota.innerHTML;
    var techLabel = document.getElementById('brand-technician-signature-label');
    if (techLabel) brandDefaults['brand-technician-signature-label'] = techLabel.textContent;
    var cotLabel = document.getElementById('cot-elaborado-label');
    if (cotLabel) brandDefaults['cot-elaborado-label'] = cotLabel.textContent;
    var validation = document.getElementById('validation-text');
    if (validation) brandDefaults['validation-text'] = validation.textContent;
    brandDefaultsCaptured = true;
  }

  var pdfBackup = null;

  function pushBackup(items, el, kind, value) {
    if (!el) return;
    items.push({ el: el, kind: kind, value: value });
  }

  function applySpanishInRoot(root, items) {
    if (!root) return;
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var def = el.getAttribute('data-i18n-default');
      if (def == null) return;
      pushBackup(items, el, 'textContent', el.textContent);
      el.textContent = def;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var def = el.getAttribute('data-i18n-default-placeholder');
      if (def == null) return;
      pushBackup(items, el, 'placeholder', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', def);
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var def = el.getAttribute('data-i18n-default-title');
      if (def == null) return;
      pushBackup(items, el, 'title', el.getAttribute('title') || '');
      el.setAttribute('title', def);
    });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(function (el) {
      var def = el.getAttribute('data-i18n-default-aria');
      if (def == null) return;
      pushBackup(items, el, 'aria-label', el.getAttribute('aria-label') || '');
      el.setAttribute('aria-label', def);
    });
    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var def = el.getAttribute('data-i18n-default-html');
      if (def == null) return;
      pushBackup(items, el, 'innerHTML', el.innerHTML);
      el.innerHTML = def;
    });
  }

  function applyPdfBrandSpanish(items) {
    var company = getCompanyName();
    var techName = getTechnicianName();

    var warrantyHeader = document.getElementById('brand-warranty-header');
    if (warrantyHeader) {
      pushBackup(items, warrantyHeader, 'innerHTML', warrantyHeader.innerHTML);
      warrantyHeader.innerHTML = '<span class="shield">🛡️</span> ' + interpolate(resolveText('formato.garantia.header', 'es'), { company: company });
    }
    var warrantyExclusion = document.getElementById('brand-warranty-exclusion');
    if (warrantyExclusion) {
      pushBackup(items, warrantyExclusion, 'innerHTML', warrantyExclusion.innerHTML);
      warrantyExclusion.innerHTML = interpolate(resolveText('formato.garantia.exclusiones.body', 'es'), { company: company });
    }
    var verificationCompany = document.getElementById('brand-verification-company');
    if (verificationCompany && verificationCompany.parentElement) {
      pushBackup(items, verificationCompany.parentElement, 'innerHTML', verificationCompany.parentElement.innerHTML);
      verificationCompany.parentElement.innerHTML = interpolate(resolveText('formato.verification', 'es'), { company: company });
    }
    var cotNota = document.getElementById('cot-nota-legal');
    if (cotNota && global.ArpaBrand && typeof global.ArpaBrand.getCotNotaLegalHtml === 'function') {
      pushBackup(items, cotNota, 'innerHTML', cotNota.innerHTML);
      cotNota.innerHTML = global.ArpaBrand.getCotNotaLegalHtml();
    }
    var techSigLabel = document.getElementById('brand-technician-signature-label');
    if (techSigLabel) {
      pushBackup(items, techSigLabel, 'textContent', techSigLabel.textContent);
      techSigLabel.textContent = techName
        ? interpolate(resolveText('formato.firma.tecnico_named', 'es'), { name: techName })
        : resolveText('formato.firma.tecnico', 'es');
    }
    var cotElabLabel = document.getElementById('cot-elaborado-label');
    if (cotElabLabel) {
      pushBackup(items, cotElabLabel, 'textContent', cotElabLabel.textContent);
      cotElabLabel.textContent = techName
        ? interpolate(resolveText('cot.firma.elaborado_named', 'es'), { name: techName })
        : resolveText('cot.firma.elaborado', 'es');
    }
  }

  function preparePdfSpanish(viewId) {
    captureDefaults();
    captureBrandDefaultsIfNeeded();
    pdfBackup = { items: [] };
    var viewRoot = document.getElementById(viewId);
    var page = document.querySelector('.page');
    var header = page ? page.querySelector('.header') : null;
    var qrPrint = document.getElementById('formato-video-qr-print');
    [viewRoot, header, qrPrint].forEach(function (root) {
      applySpanishInRoot(root, pdfBackup.items);
    });
    applyPdfBrandSpanish(pdfBackup.items);
    var viewKey = String(viewId || '').replace('view-', '');
    var docType = document.getElementById('doc-type-label');
    if (docType) {
      pushBackup(pdfBackup.items, docType, 'textContent', docType.textContent);
      docType.textContent = resolveText(DOC_TYPE_KEYS[viewKey] || DOC_TYPE_KEYS.formato, 'es');
    }
  }

  function restorePdfSpanish() {
    if (!pdfBackup) return;
    pdfBackup.items.forEach(function (item) {
      if (!item.el) return;
      if (item.kind === 'placeholder') item.el.setAttribute('placeholder', item.value);
      else if (item.kind === 'title') item.el.setAttribute('title', item.value);
      else if (item.kind === 'aria-label') item.el.setAttribute('aria-label', item.value);
      else item.el[item.kind] = item.value;
    });
    pdfBackup = null;
    refreshBrandTexts();
  }

  function applyCotNotaLegal() {
    var cotNota = document.getElementById('cot-nota-legal');
    if (cotNota && global.ArpaBrand && typeof global.ArpaBrand.getCotNotaLegalHtml === 'function') {
      cotNota.innerHTML = global.ArpaBrand.getCotNotaLegalHtml();
    }
  }

  function refreshBrandTexts() {
    captureBrandDefaultsIfNeeded();
    var lang = currentLang;
    var company = getCompanyName();
    var techName = getTechnicianName();

    if (lang === 'es') {
      var header = document.getElementById('brand-warranty-header');
      if (header && brandDefaults['brand-warranty-header'] != null) {
        header.innerHTML = brandDefaults['brand-warranty-header'];
      }
      var exclusion = document.getElementById('brand-warranty-exclusion');
      if (exclusion && brandDefaults['brand-warranty-exclusion'] != null) {
        exclusion.innerHTML = brandDefaults['brand-warranty-exclusion'];
      }
      var companyEl = document.getElementById('brand-verification-company');
      if (companyEl && companyEl.parentElement && brandDefaults['brand-verification-p'] != null) {
        companyEl.parentElement.innerHTML = brandDefaults['brand-verification-p'];
      }
      var nota = document.getElementById('cot-nota-legal');
      if (nota && brandDefaults['cot-nota-legal'] != null) {
        nota.innerHTML = brandDefaults['cot-nota-legal'];
      }
      var techLabel = document.getElementById('brand-technician-signature-label');
      if (techLabel && brandDefaults['brand-technician-signature-label'] != null) {
        techLabel.textContent = brandDefaults['brand-technician-signature-label'];
      }
      var cotLabel = document.getElementById('cot-elaborado-label');
      if (cotLabel && brandDefaults['cot-elaborado-label'] != null) {
        cotLabel.textContent = brandDefaults['cot-elaborado-label'];
      }
      applyCotNotaLegal();
      return;
    }

    var warrantyHeader = document.getElementById('brand-warranty-header');
    if (warrantyHeader) {
      warrantyHeader.innerHTML = '<span class="shield">🛡️</span> ' + t('formato.garantia.header', { company: company });
    }
    var warrantyExclusion = document.getElementById('brand-warranty-exclusion');
    if (warrantyExclusion) {
      warrantyExclusion.innerHTML = t('formato.garantia.exclusiones.body', { company: company });
    }
    var verificationCompany = document.getElementById('brand-verification-company');
    if (verificationCompany && verificationCompany.parentElement) {
      verificationCompany.parentElement.innerHTML = t('formato.verification', { company: company });
    }
    var techSigLabel = document.getElementById('brand-technician-signature-label');
    if (techSigLabel) {
      techSigLabel.textContent = techName
        ? t('formato.firma.tecnico_named', { name: techName })
        : t('formato.firma.tecnico');
    }
    var cotElabLabel = document.getElementById('cot-elaborado-label');
    if (cotElabLabel) {
      cotElabLabel.textContent = techName
        ? t('cot.firma.elaborado_named', { name: techName })
        : t('cot.firma.elaborado');
    }
    applyCotNotaLegal();
  }

  function refreshDocTypeLabel() {
    var el = document.getElementById('doc-type-label');
    if (!el) return;
    var view = 'formato';
    if (global.ArpaViews && typeof global.ArpaViews.getCurrentView === 'function') {
      view = global.ArpaViews.getCurrentView() || 'formato';
    }
    var key = DOC_TYPE_KEYS[view] || DOC_TYPE_KEYS.formato;
    el.textContent = t(key);
  }

  function wrapFunction(name, afterFn) {
    function attempt() {
      if (typeof global[name] !== 'function') return false;
      if (global[name].__arpaI18nWrapped) return true;
      var original = global[name];
      global[name] = function () {
        var result = original.apply(this, arguments);
        if (typeof afterFn === 'function') afterFn();
        return result;
      };
      global[name].__arpaI18nWrapped = true;
      return true;
    }
    if (attempt()) return;
    var retries = 0;
    (function retry() {
      if (attempt() || retries > 40) return;
      retries += 1;
      setTimeout(retry, 50);
    })();
  }

  function wrapExternalFunctions() {
    wrapFunction('applyUserSettingsToUI', refreshBrandTexts);
  }

  function patchShowView() {
    if (!global.ArpaViews || typeof global.ArpaViews.showView !== 'function') return;
    if (global.ArpaViews.showView.__arpaI18nWrapped) return;
    var original = global.ArpaViews.showView;
    global.ArpaViews.showView = function (view, btn) {
      original.call(this, view, btn);
      refreshDocTypeLabel();
    };
    global.ArpaViews.showView.__arpaI18nWrapped = true;

    if (typeof global.ArpaViews.openHistorialView === 'function' && !global.ArpaViews.openHistorialView.__arpaI18nWrapped) {
      var origHist = global.ArpaViews.openHistorialView;
      global.ArpaViews.openHistorialView = function (btn) {
        origHist.call(this, btn);
        refreshDocTypeLabel();
      };
      global.ArpaViews.openHistorialView.__arpaI18nWrapped = true;
    }
  }

  function init() {
    captureDefaults();
    supplementSpanishKeys();
    currentLang = readStoredLang();
    bindLangSwitch();
    apply(currentLang);
    setTimeout(function () {
      wrapExternalFunctions();
      refreshBrandTexts();
      refreshDocTypeLabel();
    }, 0);
    global.addEventListener('load', function () {
      patchShowView();
      refreshBrandTexts();
      refreshDocTypeLabel();
    });
  }

  global.ArpaI18n = {
    getLang: getLang,
    setLang: setLang,
    apply: apply,
    t: t,
    translateIn: translateIn,
    init: init,
    refreshDocTypeLabel: refreshDocTypeLabel,
    refreshBrandTexts: refreshBrandTexts,
    preparePdfSpanish: preparePdfSpanish,
    restorePdfSpanish: restorePdfSpanish,
    KEY_COUNT: Object.keys(I18N_EN).length
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
