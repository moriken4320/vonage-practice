class CampaignsController < ApplicationController
    before_action :authenticate_admin!, only: [:show_moderator, :generate_publisher_token]
    before_action :get_campaign, only: [:show, :show_moderator, :show_publisher, :show_subscriber, :generate_moderator_token, :generate_publisher_token]
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
    end

    def show_moderator
        @apiKey = VonageService::VONAGE_PROJECT_API_KEY;
    end

    def show_publisher
        # トークン発行
        if @campaign.present? && @campaign.session_id.present?
            @opentok_info = VonageService.generate_access_token(
                { role: :publisher, data: "パネリスト" },
                @campaign.session_id
            )
        end
    end

    def show_subscriber
        # トークン発行
        if @campaign.present? && @campaign.session_id.present?
            @opentok_info = VonageService.generate_access_token(
                { role: :subscriber, data: "視聴者" },
                @campaign.session_id
            )
        end
    end

    def generate_moderator_token
        opentok_info = VonageService.generate_access_token(
            { role: :moderator, data: params[:data] },
            @campaign.session_id
        )
        render json: opentok_info[:token]
    end
    def generate_publisher_token
        opentok_info = VonageService.generate_access_token(
            { role: :publisher, data: params[:data] },
            @campaign.session_id
        )
        render json: opentok_info[:token]
    end

    private

    def campaign_params
        params.require(:campaign).permit(:title).merge(session_id: VonageService.generate_session.session_id)
    end

    def get_campaign
        @campaign = Campaign::find(params[:id])
    end
end
