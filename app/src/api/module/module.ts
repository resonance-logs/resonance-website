import api from '../axios'

export interface GetModuleDataParams {
  charId: string
}

export interface UpgradeRecord {
  PartId: number
  IsSuccess: boolean
}

export interface ModInfo {
  PartIds?: number[]
  UpgradeRecords?: UpgradeRecord[]
  SuccessRate?: number
  InitLinkNums?: number[]
  [k: string]: unknown
}

export interface Mod {
  ModSlots?: Record<string, string>
  ModInfos?: Record<string, ModInfo>
  [k: string]: unknown
}

export interface Item {
  Uuid: string
  ConfigId: number
  Count?: string
  CreateTime?: string
  OptSrc?: number
  Quality?: number
  EquipAttr?: { EquipAttrSet?: Record<string, unknown> }
  ModAttr?: Record<string, unknown>
  ModNewAttr?: { ModParts?: number[] }
  AffixData?: Record<string, unknown>
  RewardId?: number
  BindFlag?: string
  [k: string]: unknown
}

export interface ItemPackage5 {
  Type: number
  MaxCapacity: number
  Items?: Record<string, Item>
  [k: string]: unknown
}

export interface GetModuleDataResponse {
  mod: Mod | null
  itemPackage5: ItemPackage5 | null
}

export async function getModuleData(params: GetModuleDataParams) {
  const { data } = await api.get<GetModuleDataResponse>(`/module/getModuleData/${params.charId}`)
  return data
}
