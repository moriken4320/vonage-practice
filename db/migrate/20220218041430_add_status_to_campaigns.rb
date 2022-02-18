class AddStatusToCampaigns < ActiveRecord::Migration[5.2]
  def change
    add_column :campaigns, :status, :integer, after: :title, null: false, default: 0
  end
end
