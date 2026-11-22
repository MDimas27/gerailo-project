
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "accounts": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"kode": string,"nama": string,"tipe": Database["public"]['Enums']["account_type"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"kode": string,"nama": string,"tipe": Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"kode"?: string,"nama"?: string,"tipe"?: Database["public"]['Enums']["account_type"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "accounts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_usage_logs": {
                  Row: {
                    "business_id": string,"created_at": string,"dikoreksi": boolean,"id": string,"model": string | null,"simpan_teks": boolean,"skor": number,"sumber": string,"teks_asli": string | null,"token": number
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"dikoreksi"?: boolean,"id"?: string,"model"?: string | null,"simpan_teks"?: boolean,"skor": number,"sumber": string,"teks_asli"?: string | null,"token"?: number
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"dikoreksi"?: boolean,"id"?: string,"model"?: string | null,"simpan_teks"?: boolean,"skor"?: number,"sumber"?: string,"teks_asli"?: string | null,"token"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_logs_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"app_settings": {
                  Row: {
                    "business_id": string,"created_at": string,"kuota_ai_periode": string,"kuota_ai_terpakai": number,"preferensi_export": NonNullable<Json>,"retensi_log_hari": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"kuota_ai_periode"?: string,"kuota_ai_terpakai"?: number,"preferensi_export"?: NonNullable<Json>,"retensi_log_hari"?: number,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"kuota_ai_periode"?: string,"kuota_ai_terpakai"?: number,"preferensi_export"?: NonNullable<Json>,"retensi_log_hari"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "app_settings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "created_at": string,"id": string,"jenis": string,"metode_bayar": string,"nama": string,"onboarding_selesai": boolean,"owner_id": string,"pdpr_consent_at": string | null,"plan": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"jenis": string,"metode_bayar"?: string,"nama": string,"onboarding_selesai"?: boolean,"owner_id": string,"pdpr_consent_at"?: string | null,"plan"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"jenis"?: string,"metode_bayar"?: string,"nama"?: string,"onboarding_selesai"?: boolean,"owner_id"?: string,"pdpr_consent_at"?: string | null,"plan"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"customers": {
                  Row: {
                    "alamat": string | null,"business_id": string,"catatan": string | null,"created_at": string,"id": string,"nama": string,"telepon": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alamat"?: string | null,"business_id": string,"catatan"?: string | null,"created_at"?: string,"id"?: string,"nama": string,"telepon": string,"updated_at"?: string
                  }
                  Update: {
                    "alamat"?: string | null,"business_id"?: string,"catatan"?: string | null,"created_at"?: string,"id"?: string,"nama"?: string,"telepon"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "business_id": string,"created_at": string,"harga_satuan": number,"id": string,"order_id": string,"product_id": string,"qty": number,"variant_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"harga_satuan": number,"id"?: string,"order_id": string,"product_id": string,"qty": number,"variant_id"?: string | null
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"harga_satuan"?: number,"id"?: string,"order_id"?: string,"product_id"?: string,"qty"?: number,"variant_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_fkey"
      columns: ["order_id","business_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "order_items_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "order_items_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "v_stock_balance"
      referencedColumns: ["product_id","business_id"]
    },{
      foreignKeyName: "order_items_variant_fkey"
      columns: ["variant_id"]
isOneToOne: false
      referencedRelation: "product_variants"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "business_id": string,"created_at": string,"customer_id": string,"dp": number,"due_date": string | null,"id": string,"kurir_nama": string | null,"metode_bayar": string,"nomor": string,"nomor_resi": string | null,"ongkir": number,"share_token": string,"status": Database["public"]['Enums']["order_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"customer_id": string,"dp"?: number,"due_date"?: string | null,"id"?: string,"kurir_nama"?: string | null,"metode_bayar"?: string,"nomor": string,"nomor_resi"?: string | null,"ongkir"?: number,"share_token": string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"customer_id"?: string,"dp"?: number,"due_date"?: string | null,"id"?: string,"kurir_nama"?: string | null,"metode_bayar"?: string,"nomor"?: string,"nomor_resi"?: string | null,"ongkir"?: number,"share_token"?: string,"status"?: Database["public"]['Enums']["order_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_fkey"
      columns: ["customer_id","business_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id","business_id"]
    }
                  ]
                },"product_aliases": {
                  Row: {
                    "alias": string,"business_id": string,"created_at": string,"id": string,"product_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alias": string,"business_id": string,"created_at"?: string,"id"?: string,"product_id": string
                  }
                  Update: {
                    "alias"?: string,"business_id"?: string,"created_at"?: string,"id"?: string,"product_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_aliases_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "product_aliases_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "v_stock_balance"
      referencedColumns: ["product_id","business_id"]
    }
                  ]
                },"product_variants": {
                  Row: {
                    "aktif": boolean,"business_id": string,"created_at": string,"id": string,"nama": string,"product_id": string,"selisih_harga": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aktif"?: boolean,"business_id": string,"created_at"?: string,"id"?: string,"nama": string,"product_id": string,"selisih_harga"?: number,"updated_at"?: string
                  }
                  Update: {
                    "aktif"?: boolean,"business_id"?: string,"created_at"?: string,"id"?: string,"nama"?: string,"product_id"?: string,"selisih_harga"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_variants_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "product_variants_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "v_stock_balance"
      referencedColumns: ["product_id","business_id"]
    }
                  ]
                },"products": {
                  Row: {
                    "aktif": boolean,"business_id": string,"created_at": string,"deskripsi_singkat": string | null,"foto_paths": (string)[],"harga_jual": number,"harga_promo": number | null,"id": string,"kategori": string | null,"nama": string,"stok_min": number,"tampil_katalog": boolean,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aktif"?: boolean,"business_id": string,"created_at"?: string,"deskripsi_singkat"?: string | null,"foto_paths"?: (string)[],"harga_jual": number,"harga_promo"?: number | null,"id"?: string,"kategori"?: string | null,"nama": string,"stok_min"?: number,"tampil_katalog"?: boolean,"updated_at"?: string
                  }
                  Update: {
                    "aktif"?: boolean,"business_id"?: string,"created_at"?: string,"deskripsi_singkat"?: string | null,"foto_paths"?: (string)[],"harga_jual"?: number,"harga_promo"?: number | null,"id"?: string,"kategori"?: string | null,"nama"?: string,"stok_min"?: number,"tampil_katalog"?: boolean,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_movements": {
                  Row: {
                    "alasan": string,"business_id": string,"created_at": string,"harga_beli": number | null,"id": string,"jenis": Database["public"]['Enums']["stock_movement_type"],"order_id": string | null,"product_id": string,"qty": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alasan": string,"business_id": string,"created_at"?: string,"harga_beli"?: number | null,"id"?: string,"jenis": Database["public"]['Enums']["stock_movement_type"],"order_id"?: string | null,"product_id": string,"qty": number
                  }
                  Update: {
                    "alasan"?: string,"business_id"?: string,"created_at"?: string,"harga_beli"?: number | null,"id"?: string,"jenis"?: Database["public"]['Enums']["stock_movement_type"],"order_id"?: string | null,"product_id"?: string,"qty"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_movements_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id","business_id"]
    },{
      foreignKeyName: "stock_movements_product_fkey"
      columns: ["product_id","business_id"]
isOneToOne: false
      referencedRelation: "v_stock_balance"
      referencedColumns: ["product_id","business_id"]
    }
                  ]
                }
          }
          Views: {
            "v_stock_balance": {
                  Row: {
                    "business_id": string | null,"product_id": string | null,"saldo": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "products_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "claim_ai_quota":
{ Args: { "p_model": string,"p_skor": number,"p_teks_asli"?: string,"p_tokens": number }; Returns: string
                           },
"confirm_draft_order":
{ Args: { "p_alamat"?: string,"p_catatan"?: string,"p_dp": number,"p_due_date"?: string,"p_items": Json,"p_metode_bayar"?: string,"p_nama": string,"p_ongkir": number,"p_telepon": string }; Returns: string
                           },
"create_business":
{ Args: { "p_jenis": string,"p_metode_bayar"?: string,"p_nama": string }; Returns: string
                           },
"create_product":
{ Args: { "p_aliases"?: (string)[],"p_business_id": string,"p_harga_beli"?: number,"p_harga_jual": number,"p_nama": string,"p_stok_awal"?: number,"p_stok_min"?: number }; Returns: string
                           },
"log_parser_extraction":
{ Args: { "p_skor": number,"p_teks_asli"?: string }; Returns: string
                           },
"mark_extraction_corrected":
{ Args: { "p_log_id": string }; Returns: undefined
                           },
"normalize_telepon":
{ Args: { "p_telepon": string }; Returns: string
                           },
"record_stock_move":
{ Args: { "p_order_id"?: string,"p_product_id": string,"p_qty": number,"p_reason"?: string,"p_type": string,"p_unit_price"?: number }; Returns: string
                           }
          }
          Enums: {
            "account_type": "ASET"|"LIABILITAS"|"EKUITAS"|"PENDAPATAN"|"HPP"|"BEBAN","order_status": "DRAFT"|"DIKONFIRMASI"|"DP_DITERIMA"|"SIAP_DIKIRIM"|"DIKIRIM"|"SELESAI"|"BATAL","stock_movement_type": "MASUK"|"KELUAR"|"PENYESUAIAN"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_type": ["ASET", "LIABILITAS", "EKUITAS", "PENDAPATAN", "HPP", "BEBAN"],"order_status": ["DRAFT", "DIKONFIRMASI", "DP_DITERIMA", "SIAP_DIKIRIM", "DIKIRIM", "SELESAI", "BATAL"],"stock_movement_type": ["MASUK", "KELUAR", "PENYESUAIAN"]
          }
        }
} as const
