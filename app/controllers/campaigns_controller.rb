class CampaignsController < ApplicationController
    def index
        @api_key = ENV["API_KEY"]
    end

end
