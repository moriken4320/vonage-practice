class AddIsRecordedToCampaign < ActiveRecord::Migration[5.2]
  def change
    add_column :campaigns, :is_recorded, :boolean, after: :status, null: false, default: false
  end
end
