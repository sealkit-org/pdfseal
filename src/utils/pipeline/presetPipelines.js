/**
 * Standard Official Preset Pipelines
 * Battle-tested automated workflows for common business and administrative tasks.
 */

export const PRESET_PIPELINES = [
  {
    id: 'preset_tender_sanitize',
    icon: 'ShieldCheck',
    color: 'emerald',
    nameKey: 'preset_tender_name',
    defaultName: '招投标与涉密公文预处理流',
    descKey: 'preset_tender_desc',
    defaultDesc: '自动清除作者与版本修改痕迹 -> 智能压缩体积 -> 加印防泄露水印',
    steps: [
      {
        id: 'step_sanitize',
        nodeId: 'node_sanitize',
        params: {
          stripDocInfo: true,
          stripGpsAndThumb: true,
          stripPieceInfo: true
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
          text: '投标专用 严禁外传',
          opacity: 0.18,
          rotation: 45,
          color: '#ef4444'
        }
      }
    ],
    exportConfig: {
      destination: 'download_files',
      namingTemplate: '{original}_TenderReady_{date}.pdf'
    }
  },

  {
    id: 'preset_receipt_packer',
    icon: 'Images',
    color: 'blue',
    nameKey: 'preset_receipt_name',
    defaultName: '发票报销多图规整流',
    descKey: 'preset_receipt_desc',
    defaultDesc: '将多张发票照片批量转为标准 A4 PDF -> 压缩适配报销系统大小限制',
    steps: [
      {
        id: 'step_img2pdf',
        nodeId: 'node_img2pdf',
        params: {
          mergeIntoOne: true,
          pageSize: 'a4'
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
      namingTemplate: 'Reimbursement_Pack_{date}.pdf'
    }
  },

  {
    id: 'preset_contract_stamp',
    icon: 'Stamp',
    color: 'amber',
    nameKey: 'preset_contract_name',
    defaultName: '合同批量盖章与防伪流',
    descKey: 'preset_contract_desc',
    defaultDesc: '自动解除权限保护 -> 尾页批量盖章/签名 -> 平铺版权防伪水印',
    steps: [
      {
        id: 'step_unlock',
        nodeId: 'node_unlock',
        params: {
          skipIfUnencrypted: true
        }
      },
      {
        id: 'step_sign',
        nodeId: 'node_sign',
        params: {
          placement: 'last_page_bottom_right',
          position: 'bottom_right',
          scale: 0.5
        }
      },
      {
        id: 'step_watermark',
        nodeId: 'node_watermark',
        params: {
          text: 'OFFICIAL CONTRACT',
          opacity: 0.15,
          rotation: 45,
          color: '#2563eb'
        }
      }
    ],
    exportConfig: {
      destination: 'download_files',
      namingTemplate: '{original}_Executed_{date}.pdf'
    }
  }
];
