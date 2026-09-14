/**
 * Standard Official Preset Pipelines
 * Battle-tested automated workflows for common business and administrative tasks in global and Western markets.
 */

export const PRESET_PIPELINES = [
  {
    id: 'preset_tender_sanitize',
    icon: 'ShieldCheck',
    color: 'emerald',
    nameKey: 'preset_tender_name',
    defaultName: 'Tender, Court & GDPR Sanitization Flow',
    descKey: 'preset_tender_desc',
    defaultDesc: 'Scrub tracking metadata -> Add formal page numbers -> Smart compression -> Stamp CONFIDENTIAL watermark',
    steps: [
      {
        id: 'step_sanitize',
        nodeId: 'node_sanitize',
        params: {
          stripDocInfo: true,
          stripGpsAndThumb: true,
          stripPieceInfo: true,
          stripAnnots: true
        }
      },
      {
        id: 'step_page_number',
        nodeId: 'node_page_number',
        params: {
          format: 'Page {n} of {total}',
          position: 'bottom_center',
          startNumber: 1,
          skipCover: false,
          fontSize: 10,
          textColor: '#334155',
          maskMode: 'full_ribbon',
          maskColor: 'auto',
          margin: 24
        }
      },
      {
        id: 'step_compress',
        nodeId: 'node_compress',
        params: {
          level: 'balanced',
          universalSizeGuard: true
        }
      },
      {
        id: 'step_watermark',
        nodeId: 'node_watermark',
        params: {
          text: 'CONFIDENTIAL',
          size: 48,
          opacity: 0.18,
          rotation: 45,
          color: '#ef4444'
        }
      }
    ],
    exportConfig: {
      destination: 'download_files',
      namingTemplate: '{original}_SubmissionReady_{date}.pdf'
    }
  },

  {
    id: 'preset_receipt_packer',
    icon: 'Images',
    color: 'blue',
    nameKey: 'preset_receipt_name',
    defaultName: 'Tax & Expense Receipts Auto-Packer',
    descKey: 'preset_receipt_desc',
    defaultDesc: 'Compile receipt photos to A4 PDF -> Add audit page numbers -> Smart compression -> Stamp EXPENSE REPORT watermark',
    steps: [
      {
        id: 'step_img2pdf',
        nodeId: 'node_img2pdf',
        params: {
          mergeIntoOne: true,
          pageSize: 'a4',
          quality: 0.85
        }
      },
      {
        id: 'step_page_number',
        nodeId: 'node_page_number',
        params: {
          format: 'Page {n} of {total}',
          position: 'bottom_center',
          startNumber: 1,
          skipCover: false,
          fontSize: 10,
          textColor: '#334155',
          maskMode: 'full_ribbon',
          maskColor: 'auto',
          margin: 24
        }
      },
      {
        id: 'step_compress',
        nodeId: 'node_compress',
        params: {
          level: 'balanced',
          universalSizeGuard: true
        }
      },
      {
        id: 'step_watermark',
        nodeId: 'node_watermark',
        params: {
          text: 'EXPENSE REPORT',
          size: 42,
          opacity: 0.12,
          rotation: 45,
          color: '#475569'
        }
      }
    ],
    exportConfig: {
      destination: 'download_files',
      namingTemplate: 'Expense_Report_{date}.pdf'
    }
  },

  {
    id: 'preset_contract_stamp',
    icon: 'Stamp',
    color: 'amber',
    nameKey: 'preset_contract_name',
    defaultName: 'Contract & NDA Execution Flow',
    descKey: 'preset_contract_desc',
    defaultDesc: 'Scrub draft revisions -> Add contract page numbers -> Stamp final page -> Tile EXECUTED COPY watermark -> Optimize compression',
    steps: [
      {
        id: 'step_sanitize',
        nodeId: 'node_sanitize',
        params: {
          stripDocInfo: true,
          stripGpsAndThumb: true,
          stripPieceInfo: true,
          stripAnnots: true
        }
      },
      {
        id: 'step_page_number',
        nodeId: 'node_page_number',
        params: {
          format: 'Page {n} of {total}',
          position: 'bottom_center',
          startNumber: 1,
          skipCover: false,
          fontSize: 10,
          textColor: '#334155',
          maskMode: 'full_ribbon',
          maskColor: 'auto',
          margin: 24
        }
      },
      {
        id: 'step_sign',
        nodeId: 'node_sign',
        params: {
          stampDataUrl: '',
          placement: 'last_page_bottom_right',
          position: 'bottom_right',
          scale: 0.5,
          addDateStamp: true
        }
      },
      {
        id: 'step_watermark',
        nodeId: 'node_watermark',
        params: {
          text: 'EXECUTED COPY',
          size: 48,
          opacity: 0.15,
          rotation: 45,
          color: '#2563eb'
        }
      },
      {
        id: 'step_compress',
        nodeId: 'node_compress',
        params: {
          level: 'balanced',
          universalSizeGuard: true
        }
      }
    ],
    exportConfig: {
      destination: 'download_files',
      namingTemplate: '{original}_Executed_{date}.pdf'
    }
  }
];
