class CampaignsController < ApplicationController
    def index
        @campaigns = Campaign::all.order(created_at: "DESC")
    end

    def new
        @campaign = Campaign.new
    end

    def create
        @campaign = Campaign.new(campaign_params)
        if @campaign.valid?
            @campaign.save
            redirect_to root_path
        else
            render :new
        end
    end

    def show
        @campaign = Campaign::find(params[:id])
    end

    private

    def campaign_params
        params.require(:campaign).permit(:title).merge(session_id: VonageService.generate_session.session_id)
    end
end
