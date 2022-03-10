module VonageService
    extend self

    # Replace with your Vonage Video Project API key
    VONAGE_PROJECT_API_KEY = ENV["API_KEY"].freeze
    # Replace with your Vonage Video Project secret
    VONAGE_PRPJECT_SECRET = ENV["SECRET_KEY"].freeze

    # セッション発行
    #
    # @return
    def generate_session
      generate_opentok.create_session(media_mode: :routed)
    end

    # トークン発行
    #
    # @params [Hash] role,data
    # @params [String] vonage session_id
    # @return [Hash] api_key,token
    def generate_access_token(option, session_id)
      opentok = generate_opentok

      ret_data = {}
      ret_data[:api_key] = opentok.api_key
      ret_data[:token] = opentok.generate_token(session_id, option)

      ret_data
    end

    # 録画開始
    #
    # @params [String] vonage session_id
    # @params [Hash] layout option
    def start_recording(session_id, layout = {})
      generate_opentok.archives.create(session_id, {
                                         name: session_id,
                                         resolution: '1280x720',
                                         layout: layout,
                                       })
    end

    # 録画終了
    #
    # @params [String] vonage session_id
    def stop_recording(session_id)
      archive_id = find_starting_archive(session_id)
      generate_opentok.archives.stop_by_id(archive_id) unless archive_id.nil?
    end

    # 録画のレイアウトを変更
    #
    # @params [String] vonage session_id
    # @params [Hash] layout options
    def change_archive_layout(session_id, options = {type: "bestFit"})
      archive_id = find_starting_archive(session_id)
      generate_opentok.archives.layout(archive_id, options) unless archive_id.nil?
    end

    # ストリームの録画レイアウトクラスを変更
    #
    # @params [String] vonage session_id
    # @params [Hash] layout options
    def change_stream_layout_class(session_id, options)
      generate_opentok.streams.layout(session_id, options) unless options.nil?
    end

    # 録画ファイルのs3保存パス取得
    # ファイルパス {vonage_api_key}/{archive_id}/archive.mp4
    #
    # @params [String] vonage session_id
    # @return [Array] ファイルパス
    def get_archive_paths(session_id)
      archives = get_archives(session_id)
      archive_paths = []

      archives.each do |archive|
        archive_paths.push("#{VONAGE_PROJECT_API_KEY}/#{archive.id}/archive.mp4")
      end

      archive_paths
    end


    private

    def generate_opentok
      OpenTok::OpenTok.new VONAGE_PROJECT_API_KEY, VONAGE_PRPJECT_SECRET
    end

    # 同一セッション内のアーカイブ取得
    #
    # @params [String] vonage session_id
    # @return
    def get_archives(session_id)
      generate_opentok.archives.all({ sessionId: session_id })
    end

    # 録画が終了していない最新のアーカイブID取得
    #
    # @params [String] vonage session_id
    # @return [String] archive_id
    def find_starting_archive(session_id)
      latest_archive = get_archives(session_id)&.first

      if latest_archive.present? && latest_archive&.status == 'paused' || latest_archive&.status == 'started'
        latest_archive.id
      else
        nil
      end
    end
end
