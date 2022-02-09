class CampaignsController < ApplicationController
    def test

    end


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

        # トークン発行
        if @campaign.present? && @campaign.session_id.present?
            @opentok_info = VonageService.generate_access_token(
                { role: :publisher },
                @campaign.session_id
            )
        end
    end

    private

    def campaign_params
        params.require(:campaign).permit(:title).merge(session_id: VonageService.generate_session.session_id)
    end
end
