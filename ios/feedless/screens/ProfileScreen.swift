//
//  Profile.swift
//  feedless
//
//  Created by Rogerio Chaves on 15/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct ProfileScreen : View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var profiles : Profiles
    @EnvironmentObject var imageLoader : ImageLoader
    @State private var selection = 0

    func profileView(_ profile: FullProfile) -> some View {
        VStack(alignment: .leading) {
            HStack(spacing: 20) {
                AsyncImage(url: Utils.avatarUrl(profile: profile.profile), imageLoader: self.imageLoader)
                .aspectRatio(contentMode: .fit)
                .frame(width: 128, height: 128)
                .border(Styles.darkGray)

                VStack {
                    Text(profile.profile.name ?? "unknown")
                        .font(.largeTitle)
                        .bold()

                    Text(profile.profile.description ?? "")
                }
            }
            PostsList(profile.posts)
        }
    }

    func profileResult() -> some View {
        if let ssbKey = context.ssbKey, let profile = profiles.profiles[ssbKey.id] {
            switch profile {
            case .loading:
                return AnyView(Text("Loading...")
                    .navigationBarTitle("Profile"))
            case let .success(profile):
                return AnyView(profileView(profile)
                    .navigationBarTitle(Text(profile.profile.name ?? "Profile"), displayMode: .inline)
                )
            case let .error(message):
                return AnyView(Text(message)
                    .navigationBarTitle("Profile"))
            }
        } else {
            return AnyView(Text("Loading...")
                .navigationBarTitle("Profile"))
        }
    }

    var body: some View {
        NavigationMenu {
            profileResult()
        }
    }
}

struct Profile_Previews: PreviewProvider {
    static var previews: some View {
        ProfileScreen()
            .environmentObject(Samples.context())
            .environmentObject(Samples.profiles())
            .environmentObject(ImageLoader())
    }
}
